/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import {
	isValidISODate,
	isValidPsc,
	isValidTimeString,
} from '../../utils/helperValidations.js';

/* TODO: rework with Zod */
export function validateParcelUpdate(data: any) {
	const errors: Record<string, string> = {};

	/* PALLETS COUNT */
	if (!data.palletsCount || typeof data.palletsCount !== 'number')
		errors.palletsCount = 'Počet palet zásilky je povinné a musí být číslo.';

	/* PALLET SPACES COUNT */
	if (!data.palletSpacesCount || typeof data.palletSpacesCount !== 'string')
		errors.palletSpacesCount =
			'Počet ložních míst zásilky je povinné a musí být řetezec.';

	/* WEIGHT */
	if (!data.weight || typeof data.weight !== 'string')
		errors.weight = 'Hmotnost zásilky je povinné a musí být řetezec.';

	/* TEMPERATURE MODE */
	if (!data.temperatureMode || typeof data.temperatureMode !== 'string')
		errors.temperatureMode =
			'Teplotní režim zásilky je povinné a musí být řetezec.';

	/* DELIVERY */
	if (
		!data.deliveryDate ||
		typeof data.deliveryDate !== 'string' ||
		!isValidISODate(data.deliveryDate)
	)
		errors.deliveryDate =
			'Datum vykládky zásilky je povinné a musí být ISO řetezec daného datu.';

	if (
		data.deliveryTimeFrom !== null &&
		(typeof data.deliveryTimeFrom !== 'string' ||
			!isValidTimeString(data.deliveryTimeFrom))
	)
		errors.deliveryTimeFrom =
			'Čas OD vykládky zásilky a musí být řetezec ve formátu HH:MM nebo H:MM.';

	if (
		data.deliveryTimeTo !== null &&
		(typeof data.deliveryTimeTo !== 'string' ||
			!isValidTimeString(data.deliveryTimeTo))
	)
		errors.deliveryTimeTo =
			'Čas DO vykládky zásilky musí být řetezec ve formátu HH:MM nebo H:MM.';

	if (!data.deliveryName || typeof data.deliveryName !== 'string')
		errors.deliveryName =
			'Název vykládky zásilky je povinné a musí být řetezec.';

	if (
		!data.deliveryStreetAddress ||
		typeof data.deliveryStreetAddress !== 'string'
	)
		errors.deliveryStreetAddress =
			'Ulice a č.p. vykládky zásilky je povinné a musí být řetezec.';

	if (
		!data.deliveryPsc ||
		typeof data.deliveryPsc !== 'string' ||
		!isValidPsc(data.deliveryPsc)
	)
		errors.deliveryPsc = 'PSČ vykládky zásilky je povinné a musí být řetezec.';

	if (!data.deliveryCity || typeof data.deliveryCity !== 'string')
		errors.deliveryCity =
			'Město vykládky zásilky je povinné a musí být řetezec.';

	if (!data.deliveryState || typeof data.deliveryState !== 'string')
		errors.deliveryState =
			'Stát vykládky zásilky je povinné a musí být řetezec.';

	if (
		data.deliveryContactName !== null &&
		typeof data.deliveryContactName !== 'string'
	)
		errors.deliveryContactName =
			'Název kontaktu pro vykládku musí být řetezec.';

	if (
		data.deliveryContactPhone !== null &&
		typeof data.deliveryContactPhone !== 'string'
	)
		errors.deliveryContactPhone =
			'Tel. číslo kontaktu pro vykládku musí být řetezec.';

	/* PICKUP */
	if (
		!data.pickupDate ||
		typeof data.pickupDate !== 'string' ||
		!isValidISODate(data.pickupDate)
	)
		errors.pickupDate =
			'Datum nakládky zásilky je povinné a musí být ISO řetezec daného datu.';

	if (
		data.pickupTimeFrom !== null &&
		(typeof data.pickupTimeFrom !== 'string' ||
			!isValidTimeString(data.pickupTimeFrom))
	)
		errors.pickupTimeFrom =
			'Čas OD nakládky zásilky musí být řetezec ve formátu HH:MM nebo H:MM.';

	if (
		data.pickupTimeTo !== null &&
		(typeof data.pickupTimeTo !== 'string' ||
			!isValidTimeString(data.pickupTimeTo))
	)
		errors.pickupTimeTo =
			'Čas DO nakládky zásilky musí být řetezec ve formátu HH:MM nebo H:MM.';

	if (!data.pickupName || typeof data.pickupName !== 'string')
		errors.pickupName = 'Název nakládky zásilky je povinné a musí být řetezec.';

	if (!data.pickupStreetAddress || typeof data.pickupStreetAddress !== 'string')
		errors.pickupStreetAddress =
			'Ulice a č.p. nakládky zásilky je povinné a musí být řetezec.';

	if (
		!data.pickupPsc ||
		typeof data.pickupPsc !== 'string' ||
		!isValidPsc(data.pickupPsc)
	)
		errors.pickupPsc = 'PSČ nakládky zásilky je povinné a musí být řetezec.';

	if (!data.pickupCity || typeof data.pickupCity !== 'string')
		errors.pickupCity = 'Město nakládky zásilky je povinné a musí být řetezec.';

	if (!data.pickupState || typeof data.pickupState !== 'string')
		errors.pickupState = 'Stát nakládky zásilky je povinné a musí být řetezec.';

	if (
		data.pickupContactName !== null &&
		typeof data.pickupContactName !== 'string'
	)
		errors.pickupContactName = 'Název kontaktu pro nakládku musí být řetezec.';

	if (
		data.pickupContactPhone !== null &&
		typeof data.pickupContactPhone !== 'string'
	)
		errors.pickupContactPhone =
			'Tel. číslo kontaktu pro nakládku musí být řetezec.';
}
