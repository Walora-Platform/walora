/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

export function jsonRowsForExport(
	customer,
	parcels,
	sequenceNumbers: number[],
) {
	const now = new Date();

	return parcels.map((parcel, i) =>
		mapParcel(customer, parcel, sequenceNumbers[i], now),
	);
}

function mapParcel(customer, parcel, sequenceNum, today: Date) {
	return {
		ZAKAZNIK: customer.code,
		PLATCE: customer.code,
		PORADI_RADA: sequenceNum,
		ID_ZASILKA: `${customer.code}${sequenceNum}`,
		DATUM_OBJEDNAVKA: formatDateToIso(today),
		DODACI_LIST: parcel.billOfLading,
		REFERENCE: parcel.reference,

		POCET: parcel.palletsCount,
		POCET_LM: parcel.palletSpacesCount,
		VAHA: parcel.weight,
		OBJEM: parcel.volume,
		TEPLOTA: parcel.temperatureMode,

		// NAKLADKA
		DATUM_NAKLADKA: formatDateToIso(new Date(parcel.pickup.date)),
		CAS_NAKLADKA: parcel.pickup.timeFrom,
		CAS_NAKLADKA_DO: parcel.pickup.timeTo,
		NAKLADKA_NAZEV: parcel.pickup.name,
		NAKLADKA_ULICE: parcel.pickup.streetAddress,
		NAKLADKA_MESTO: parcel.pickup.city,
		NAKLADKA_PSC: parcel.pickup.psc,
		NAKLADKA_STAT: parcel.pickup.state,
		NAKLADKA_KONTAKT: parcel.pickup.contactName,
		NAKLADKA_TELEFON: parcel.pickup.contactPhone,

		// VYKLADKA
		DATUM_VYKLADKA: formatDateToIso(new Date(parcel.delivery.date)),
		CAS_VYKLADKA: parcel.delivery.timeFrom,
		CAS_VYKLADKA_DO: parcel.delivery.timeTo,
		VYKLADKA_NAZEV: parcel.delivery.name,
		VYKLADKA_ULICE: parcel.delivery.streetAddress,
		VYKLADKA_MESTO: parcel.delivery.city,
		VYKLADKA_PSC: parcel.delivery.psc,
		VYKLADKA_STAT: parcel.delivery.state,
		VYKLADKA_KONTAKT: parcel.delivery.contactName,
		VYKLADKA_TEL: parcel.delivery.contactPhone,
		POZN_DORUCENI: parcel.delivery.note,

		// CASH ON DELIVERY
		COD: parcel.cashOnDelivery?.amount ? 1 : 0,
		COD_CZK: parcel.cashOnDelivery?.amount,
	};
}

function formatDateToIso(date: Date) {
	return date.toISOString().split('T')[0];
}
