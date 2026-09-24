/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import fs from 'fs';
import XLSX, { WorkBook } from 'xlsx';
import {
	ParsedTariffFile,
	TariffPartParsed,
	ZoneParsed,
} from './tariffs.service.js';
import { psc } from '../extApi/extApi.validation.js';
import { TariffPurpose } from '../../config/generated/prisma-client/enums.js';
import { RequestError } from '../../errors/RequestError.js';

type TariffPartErrors = {
	zones: string[];
	rates: string[];
};

export function validateSubjects(
	purpose: TariffPurpose,
	customerIds?: string[],
	carrierIds?: string[],
) {
	// subject validation
	switch (purpose) {
		case 'COST':
			if (customerIds?.length) {
				throw new RequestError(
					'Nákladový tarif neni možné přiřadit zákazníkovi',
				);
			}

			if (!carrierIds?.length) {
				throw new RequestError('Určte komu má tarif patřit');
			}
			break;
		case 'REVENUE':
			if (carrierIds?.length) {
				throw new RequestError('Výnosový tarif neni možné přiřadit dopravcovi');
			}
			if (!customerIds?.length) {
				throw new RequestError('Určte komu má tarif patřit');
			}
			break;
		default:
			throw new RequestError(`Systém neeviduje typ tarifu ${purpose}`);
	}
}

export function validateTariff(parsed: ParsedTariffFile): string[] {
	const errors: string[] = [];

	const mapZonesErrs = (e) => `[Zóny]: ${e}`;
	const mapRatesErrs = (e) => `[Sazby]: ${e}`;

	if (parsed.structure === 'ALL_IN_ONE') {
		const part = validateTariffPart(parsed.data);

		errors.push(
			...part.zones.map(mapZonesErrs),
			...part.rates.map(mapRatesErrs),
		);
		return errors;
	}

	const mapZonesPickupErrs = (e) => `[Zóny-svoz]: ${e}`;
	const mapRatesPickupErrs = (e) => `[Sazby-svoz]: ${e}`;

	const pickup = validateTariffPart(parsed.pickup);
	const deliver = validateTariffPart(parsed.deliver);

	errors.push(
		...pickup.zones.map(mapZonesPickupErrs),
		...pickup.rates.map(mapRatesPickupErrs),
		...deliver.zones.map(mapZonesErrs),
		...deliver.rates.map(mapRatesErrs),
	);

	return errors;
}

function validateTariffPart(data: TariffPartParsed): TariffPartErrors {
	const errors: TariffPartErrors = {
		zones: [],
		rates: [],
	};

	const { zones, rates } = data;

	/* BASIC CHECKS */
	if (!zones.length) errors.zones.push('nenalezeny žádné zóny');

	if (!rates.thresholds.length)
		errors.rates.push('nenelezeny žádné thresholdy');

	/* ZONES */
	for (const zone of zones) {
		if (!zone.label) {
			errors.zones.push('zóna bez názvu');
			continue;
		}

		if (!zone.ranges.length) {
			errors.zones.push(`zóna "${zone.label}" nemá žádné PSČ rozsahy`);
			continue;
		}

		const zoneErrs = [];

		zone.ranges.forEach((range, idx) => {
			const start = psc.safeParse(range.start);
			const end = psc.safeParse(range.end);
			const row = idx + 2;

			if (!start.success) {
				zoneErrs.push(`nesprávný formát PSČ (řádek ${row}, vlevo)`);
			}

			if (!end.success) {
				zoneErrs.push(`nesprávný formát PSČ (řádek ${row}, vpravo)`);
			}

			if (Number(start.data) > Number(end.data)) {
				zoneErrs.push(
					`neplatný rozsah ${start.data} - ${end.data} (řádek ${row})`,
				);
			}
		});

		errors.zones.push(...zoneErrs.map((e) => `zóna "${zone.label}" ${e}`));
	}

	/* ZONES - OVERLAPS */
	errors.zones.push(...validateZoneOverlaps(zones));

	/* RATES - THRESHOLDS */
	const th = rates.thresholds;

	// threshold NaN check
	th.forEach((t, i) => {
		if (Number.isNaN(t)) {
			errors.rates.push(`chybí threshold na řádku ${i + 2}`);
		}
	});

	// tresholds must ascend check
	for (let i = 1 /* starting from second element */; i < th.length; i++) {
		const prev = th[i - 1];
		const curr = th[i];

		if (curr <= prev) {
			errors.rates.push(
				`thresholdy musí být vzestupné (po ${prev} je ${curr})`,
			);
		}
	}

	/* RATES vs ZONES */
	const zoneLabels = zones.map((z) => z.label);
	for (const label of zoneLabels) {
		if (label === undefined) {
			continue;
		}

		const zonePrices = rates.prices[label];

		if (!zonePrices) {
			errors.rates.push(`chybí sazby pro zónu "${label}"`);
			continue;
		}

		if (zonePrices.length !== th.length) {
			errors.rates.push(
				`zóna "${label}" má nesprávný počet cen (${zonePrices.length} vs ${th.length})`,
			);
			continue;
		}

		zonePrices.forEach((price, i) => {
			if (Number.isNaN(price)) {
				errors.rates.push(
					`v zóne "${label}" chybí cena pro řádek ${i + 1} resp. sadzba pro <${th[i]}, ${th[i + 1]})`,
				);
			}
		});
	}

	for (const label of Object.keys(rates.prices)) {
		if (!zoneLabels.includes(label)) {
			errors.rates.push(`neznámá zóna "${label}"`);
		}
	}

	return errors;
}

function validateZoneOverlaps(zones: ZoneParsed[]) {
	const toPscString = (n: number) => String(n).padStart(5, '0');
	const errors: string[] = [];

	// flatten ranges
	const allRanges = zones.flatMap((zone) =>
		zone.ranges.map((range) => ({
			start: Number(range.start),
			end: Number(range.end),
			label: zone.label,
		})),
	);

	// sort by start and then by end
	const sorted = allRanges.sort((a, b) =>
		a.start === b.start ? a.end - b.end : a.start - b.start,
	);

	for (let i = 1; i < sorted.length; i++) {
		const prev = sorted[i - 1];
		const curr = sorted[i];

		// duplicities
		if (prev.start === curr.start && prev.end === curr.end) {
			errors.push(
				`duplicitní rozsah ${toPscString(curr.start)}-${toPscString(curr.end)} v zónach "${prev.label}" a "${curr.label}"`,
			);
			continue;
		}

		// overlaps
		if (curr.start <= prev.end) {
			if (curr.label === prev.label) {
				// overlap in the same zone
				errors.push(
					`zóna "${curr.label}" má průnik PSČ rozsahů (${toPscString(prev.start)}-${toPscString(prev.end)}) a (${toPscString(curr.start)}-${toPscString(curr.end)})`,
				);
			}

			// overlap in-between zones
			errors.push(
				`průnik PSČ rozsahů mezi zónami "${prev.label}" (${toPscString(prev.start)}-${toPscString(prev.end)}) a "${curr.label}" (${toPscString(curr.start)}-${toPscString(curr.end)})`,
			);
		}
	}

	return errors;
}

// helper to normalize zone label
const normLabel = (label: any) => {
	return String(label ?? '')
		.toString()
		.trim();
};
