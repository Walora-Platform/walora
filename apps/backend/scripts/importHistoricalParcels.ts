/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import xlsx from 'xlsx';
import path from 'path';
import { parcelsQueue } from '/app/apps/backend/src/queues';
import prisma from '../src/config/prisma';

async function run() {
	console.log('Starting historical import...');
	console.log('Current working directory:', process.cwd());
	const xlsxPath = path.join(process.cwd(), 'scripts/parcelsImport.xlsx');

	// get the parcels from historicalParcelsForImport.xlsx
	const file = xlsx.readFile(xlsxPath, {
		cellDates: true, // parse dates to correct UTC string
	});

	const firstSheet = Object.values(file.Sheets)[0]; // first sheet

	let dataArr = xlsx.utils.sheet_to_json(firstSheet);

	// process parcels = rows
	let parcels = dataArr.map(mapRowToJobInsertParcel);

	// insert import jobs
	await parcelsQueue.addBulk(parcels);

	console.log('Queued', parcels.length, 'parcels.');

	process.exit(0);
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});

function mapRowToJobInsertParcel(row) {
	return {
		name: 'insert-historic-parcels-from-manual-import',
		data: {
			status: 'DELIVERED',
			customerCode: row.ZAKAZNIK,
			type: toNull(row.IDU_TYP_ZASILKY),
			sequenceNum: Number(row.PORADI_RADA),
			payer: toNull(row.PLATCE),

			carrierName: row.IDU_DOPRAVCE,
			createdAt: row.DATUM_OBJEDNAVKA,
			billOfLadingNum: row.DODACI_LIST,
			customerReference: row.REFERENCE ? String(row.REFERENCE) : null,

			pickup: {
				date: toNull(row.DATUM_NAKLADKA),
				timeFrom: formatTime(row.CAS_NAKLADKA),
				timeTo: formatTime(row.CAS_NAKLADKA_DO),
				name: row.NAKLADKA_NAZEV,
				streetAddress: row.NAKLADKA_ULICE,
				city: row.NAKLADKA_MESTO,
				psc: row.NAKLADKA_PSC,
				state: row.NAKLADKA_STAT,
				contact: {
					name: toNull(row.NAKLADKA_KONTAKT),
					phone: toNull(row.NAKLADKA_TELEFON),
				},
			},
			delivery: {
				date: toNull(row.DATUM_VYKLADKA),
				timeFrom: formatTime(row.CAS_VYKLADKA),
				timeTo: formatTime(row.CAS_VYKLADKA_DO),
				name: row.VYKLADKA_NAZEV,
				streetAddress: emptyStreetAdress(row.VYKLADKA_ULICE),
				city: row.VYKLADKA_MESTO,
				psc: row.VYKLADKA_PSC,
				state: row.VYKLADKA_STAT,
				note: toNull(row.POZN_DORUCENI),
				contact: {
					name: toNull(row.VYKLADKA_KONTAKT),
					phone: toNull(row.VYKLADKA_TEL),
				},
			},

			palletsCount: toNull(row.POCET),
			palletSpacesCount: toNull(row.POCET_LM),
			weight: toNull(row.VAHA),
			volume: toNull(row.OBJEM),
			temperatureMode: toNull(row.TEPLOTA),

			codAmount: toNull(row.COD_CZK),
			codCurrency: 'CZK',
			codPaidOutDate: toNull(row.COD_DAT_ZAPL),
			note: toNull(row.TRACK),
		},
	};
}

function emptyStreetAdress(address) {
	if (!address || address === '') return ' ';
}

// "17:00:00" -> returns "17:00"
// if time is undefined -> returns null
function formatTime(time) {
	if (!time) return null;
	return time.slice(0, 5);
}

function toNull(value) {
	if (value === '' || value === undefined || value === 0 || value === '0')
		return null;
	return value;
}
