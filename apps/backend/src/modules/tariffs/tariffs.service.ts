/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import prisma from '../../config/prisma.js';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import xlsx, { WorkBook, WorkSheet } from 'xlsx';
import { tariffsUploadDir } from '../../middlewares/multer.js';
import { formatDate, formatTime } from '../../utils/datetimes.js';
import { validateTariff } from './tariffs.validation.js';
import { ApiError } from '../../errors/ApiError.js';
import { RequestError } from '../../errors/RequestError.js';
import HTTP from '../../utils/constants/httpCodes.js';
import {
	TariffPartType,
	TariffPurpose,
	TariffStatus,
	TariffStructure,
} from '../../config/generated/prisma-client/enums.js';
import { psc } from '../extApi/extApi.validation.js';
import ERROR_CODE from '../../utils/constants/errorCodes.js';
import { Prisma } from '../../config/generated/prisma-client/client.js';

type ZoneRange = { start: string; end: string };
export type ZoneParsed = { label: string; ranges: ZoneRange[] };

type RatesParsed = {
	thresholds: number[]; // first column keys (number of pallets or weight)
	prices: Record<string, number[]>; // key = zone label, value = array of prices aligned to thresholds
};

export type TariffPartParsed = {
	zones: ZoneParsed[];
	rates: RatesParsed;
};

export type ParsedTariffFile =
	| {
			structure: 'ALL_IN_ONE';
			data: TariffPartParsed;
	  }
	| {
			structure: 'SPLIT';
			pickup: TariffPartParsed;
			deliver: TariffPartParsed;
	  };

const calculationMap = {
	PALLET: 'paletový',
	WEIGHT: 'kilogramový',
} as const;

const purposeMap = {
	COST: 'nákladový',
	REVENUE: 'výnosový',
} as const;

const structureMap = {
	ALL_IN_ONE: 'společně',
	SPLIT: 'svoz/rozvoz',
} as const;

interface CreateTariffInput {
	name: string;
	purpose: 'COST' | 'REVENUE';
	structure: 'ALL_IN_ONE' | 'SPLIT';
	calculation: 'PALLET' | 'WEIGHT';
	validFrom: Date;
	validTo: Date | null;
	carrierIds?: string[];
	customerCompanyIds?: string[];
	file: Express.multer.file;
	userId: string;
}

export async function createTariff(data: CreateTariffInput) {
	const cleanup = async () => {
		if (data.file?.path && fs.existsSync(data.file.path)) {
			await fsp.unlink(data.file.path);
		}
	};

	try {
		// parse tariff data
		const parsed = parseTariffFile(data.file, data.structure);

		// validate
		const errors = validateTariff(parsed);

		if (errors.length) {
			throw new RequestError(
				'Nesprávný format dat v souboru',
				HTTP.BAD_REQUEST,
				errors,
				ERROR_CODE.BAD_FILE_FORMAT,
			);
		}

		// transform
		const partsData = transformTariff(parsed, data.structure);

		//debugTariffData(data, partsData);

		// save tariff
		const tariff = await prisma.tariff.create({
			data: {
				name: data.name,
				purpose: data.purpose,
				structure: data.structure,
				calculation: data.calculation,
				validFrom: data.validFrom,
				validTo: data.validTo,
				status: getStatus(data.validFrom, data.validTo),

				filename: data.file.filename,
				originalName: data.file.originalname,

				createdById: data.userId,

				/* create many-to-many tariffSubjects */
				tariffSubjects: {
					create: buildSubjects(data),
				},

				/* create many-to-many tariff parts */
				parts: {
					create: partsData,
				},
			},
		});

		return tariff;
	} catch (err) {
		await cleanup();
		throw err;
	}
}

function debugTariffData(
	data: CreateTariffInput,
	partsData: ReturnType<typeof transformTariff>,
) {
	console.log('name', data.name);
	console.log('purpose', data.purpose);
	console.log('structure', data.structure);
	console.log('calculation', data.calculation);
	console.log('validFrom', data.validFrom);
	console.log('validTo', data.validTo);
	console.log('status', getStatus(data.validFrom, data.validTo));
	console.log('filename', data.file.filename);
	console.log('originalName', data.file.originalname);
	console.log('createdById', data.userId);
	console.log('tariffSubjects', buildSubjects(data));

	console.log('parts');
	for (const part of partsData) {
		console.log('\n PART:', part.partType);

		for (const zone of part.zones.create) {
			console.log('\t Zone:', zone.label);

			console.log('\t\t Ranges:');
			for (const r of zone.ranges.create) {
				console.log(`\t\t\t ${r.start} - ${r.end}`);
			}

			console.log('\t\t Rates:');
			for (const rate of zone.rates.create) {
				console.log(
					`\t\t\t ${rate.fromValue} - ${rate.toValue} : ${rate.price}`,
				);
			}
		}
	}
}

/* 
debugFindRate(partsData, {
	psc: '60001',
	palletsCount: 5,
	partType: 'ALL_IN_ONE',
}); */
function debugFindRate(
	partsData,
	input: { psc: string; palletsCount: number; partType: TariffPartType },
) {
	const { psc, palletsCount, partType } = input;

	const part = partsData.find((p) => p.partType === partType);

	if (!part) {
		console.log('Part not found');
		return null;
	}

	const pscNum = Number(psc);

	// find zone
	for (const zone of part.zones.create) {
		const match = zone.ranges.create.find((r) => {
			return pscNum >= Number(r.start) && pscNum <= Number(r.end);
		});

		if (!match) continue;

		// found zone
		console.log(`Zone matched: ${zone.label}`);

		// find rate
		for (const rate of zone.rates.create) {
			if (palletsCount >= rate.fromValue && palletsCount <= rate.toValue) {
				console.log(
					`Rate found: ${rate.fromValue}-${rate.toValue} => ${rate.price}`,
				);

				return {
					zone: zone.label,
					price: rate.price,
					rate,
				};
			}
		}

		// did not find rate in given zone
		console.log(
			`No rate found for palletsCount=${palletsCount} in zone ${zone.label}`,
		);

		return null;
	}

	console.log(`No zone found for PSC ${psc}`);
	return null;
}

export async function getAll(purpose: TariffPurpose) {
	const tariffs = await prisma.tariff.findMany({
		where: { purpose },
		omit: { purpose: true, filename: true, originalName: true },
		include: {
			createdBy: {
				select: { firstName: true, lastName: true },
			},
			tariffSubjects: {
				select: {
					customerCompany: { select: { code: true } },
					carrier: { select: { name: true } },
				},
			},
		},
	});

	const sorted = sortTariffs(tariffs);
	return sorted.map(mapTariff);
}

export async function checkNameConstraint(name: string) {
	const nameExists = await prisma.tariff.findUnique({ where: { name } });
	if (nameExists) throw new RequestError('Tarif s tímto jménem již existuje');
}

interface CheckActiveTariffInput {
	customerIds?: string[];
	carrierIds?: string[];
	newValidFrom: Date;
	newValidTo: Date | null;
	excludeTariffId?: string;
}

export async function checkTariffValidityPeriodOverlap(
	input: CheckActiveTariffInput,
) {
	const {
		customerIds = [],
		carrierIds = [],
		newValidFrom,
		newValidTo,
		excludeTariffId,
	} = input;

	const subjectFilter = [
		customerIds.length ? { customerCompanyId: { in: customerIds } } : undefined,
		carrierIds.length ? { carrierId: { in: carrierIds } } : undefined,
	].filter(Boolean);

	if (!subjectFilter.length) throw new Error('Subject filter empty');

	const MAX_DATE = new Date('9999-12-31');
	const newValidToNormalized = newValidTo ?? MAX_DATE;

	const conflicts = await prisma.tariffSubject.findMany({
		where: {
			OR: subjectFilter,
			tariff: {
				id: excludeTariffId ? { not: excludeTariffId } : undefined,
				status: { not: 'ARCHIVED' }, // archived tariffs are not taken in account (on unarchivation of archivated tariff, this function will be also called to check validity period overlap)
				validFrom: { lte: newValidToNormalized }, // existing validFrom <= new validTo -> overlap
				OR: [{ validTo: null }, { validTo: { gte: newValidFrom } }], // existing validTo is null OR existing validTo >= validFrom -> overlap
			},
		},
		select: {
			customerCompany: { select: { code: true } },
			carrier: { select: { name: true } },
			tariff: { select: { name: true, validFrom: true, validTo: true } },
		},
	});

	if (conflicts.length === 0) return;

	const messages = conflicts.map((c) => {
		const subject = c.customerCompany
			? `Zákazník ${c.customerCompany.code}`
			: `Dopravce ${c.carrier.name}`;

		const formattedFrom = formatDate(c.tariff.validFrom);
		const formattedTo = formatDate(c.tariff.validTo);
		const formattedToMessage = formattedTo ? `do ${formattedTo}` : '';

		return `${subject} již má tarif "${c.tariff.name}" v období od ${formattedFrom} ${formattedToMessage}.`;
	});

	throw new RequestError(
		'Průnik doby platnosti tarifů, viz podrobnosti.',
		HTTP.BAD_REQUEST,
		messages,
		ERROR_CODE.VALID_PERIOD_OVERLAP,
	);
}

function sortTariffs(tariffs) {
	const order: Record<TariffStatus, number> = {
		ACTIVE: 1,
		WAITING: 2,
		ARCHIVED: 3,
		INACTIVE: 4,
	};

	return tariffs.sort((a, b) => {
		// by status
		const statusDiff = order[a.status] - order[b.status];
		if (statusDiff !== 0) return statusDiff;

		// by validFrom (desc)
		const dateDiff = b.validFrom.getTime() - a.validFrom.getTime();
		if (dateDiff !== 0) return dateDiff;

		// by name (asc)
		return a.name.localeCompare(b.name, 'cs');
	});
}

export async function downloadTariffXlsxById(id: string) {
	const tariff = await prisma.tariff.findUnique({
		where: {
			id: id,
		},
		select: {
			filename: true,
			name: true,
		},
	});

	const tariffPath = path.join(tariffsUploadDir, tariff.filename);

	return { path: tariffPath, name: tariff.name.replaceAll('/', '_') };
}

export async function archivateTariffById(id: string) {
	await prisma.tariff.update({
		where: { id },
		data: { status: 'ARCHIVED' },
	});
}

export async function unarchivateTariffById(id: string) {
	const tariff = await prisma.tariff.findUnique({
		where: { id },
		select: {
			status: true,
			validFrom: true,
			validTo: true,
			tariffSubjects: {
				select: {
					customerCompanyId: true,
					carrierId: true,
				},
			},
		},
	});

	if (!tariff) {
		throw new RequestError('Tarif nebyl nalezen', HTTP.NOT_FOUND);
	}

	if (tariff.status !== 'ARCHIVED') {
		throw new RequestError('Tarif neni archivován');
	}

	const customerIds = tariff.tariffSubjects
		.map((s) => s.customerCompanyId)
		.filter((id): id is string => Boolean(id));

	const carrierIds = tariff.tariffSubjects
		.map((s) => s.carrierId)
		.filter((id): id is string => Boolean(id));

	const nextStatus = getStatus(tariff.validFrom, tariff.validTo);

	// throws error on overlap
	await checkTariffValidityPeriodOverlap({
		customerIds,
		carrierIds,
		newValidFrom: tariff.validFrom,
		newValidTo: tariff.validTo,
	});

	await prisma.tariff.update({
		where: { id },
		data: { status: nextStatus },
	});
}

export async function deleteTariffById(id: string) {
	if (!id) {
		throw new RequestError('Pro smazání tarifu je nutné zadat jeho id');
	}

	try {
		const tariff = await prisma.tariff.delete({
			where: { id },
			select: { filename: true },
		});

		const tariffPath = path.join(tariffsUploadDir, tariff.filename);

		// delete tariff xlsx file
		await fsp.unlink(tariffPath);
	} catch (err) {
		if (err instanceof Prisma.PrismaClientKnownRequestError) {
			if (err.code === 'P2025') {
				throw new RequestError('Tarif nebyl nalezen', HTTP.NOT_FOUND);
			}

			if (err.code === 'P2003') {
				throw new RequestError(
					'Tarif nelze smazat, protože je navázán na další záznamy v systému (např. fakturační dávka).',
				);
			}
		}
	}
}

// function used as mapping for each tariff
// use as tariffs.map(mapTariff); (each tariff will get implicitly inserted as first parameter)
function mapTariff(tariff) {
	const subjects = tariff.tariffSubjects
		.sort((a, b) => {
			const aVal = a.customerCompany?.code ?? a.carrier?.name ?? '';
			const bVal = b.customerCompany?.code ?? b.carrier?.name ?? '';

			return aVal.localeCompare(bVal);
		})
		.map((ts) => {
			if (ts.customerCompany) {
				return {
					value: ts.customerCompany.code,
				};
			}

			if (ts.carrier) {
				return {
					value: ts.carrier.name,
				};
			}

			return null;
		})
		.filter(Boolean);
	return {
		id: tariff.id,
		name: tariff.name,
		structure: structureMap[tariff.structure],
		calculation: calculationMap[tariff.calculation],
		status: tariff.status,
		validFrom: formatDate(tariff.validFrom),
		validTo: formatDate(tariff.validTo),
		updated: {
			date: formatDate(tariff.updatedAt),
			time: formatTime(tariff.updatedAt),
		},
		created: {
			date: formatDate(tariff.createdAt),
			time: formatTime(tariff.createdAt),

			by: tariff.createdBy ?? null,
		},
		subjects,
	};
}

function getTodayDate(): Date {
	const now = new Date();

	const today = now.toLocaleString('cs', {
		timeZone: 'Europe/Prague',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});

	const [day, month, year] = today.split('. ').map(Number);

	return new Date(Date.UTC(year, month - 1, day));
}

// compares date based on status (dates are in TZ Europe/Prague, but convered to UTC date midnight)
function getStatus(validFrom: Date, validTo: Date | null): TariffStatus {
	const today = getTodayDate();

	let status: TariffStatus;

	if (today < validFrom) return 'WAITING';
	if (validTo && today > validTo) return 'INACTIVE';
	return 'ACTIVE';
}

function buildSubjects(data: CreateTariffInput) {
	if (data.purpose === 'COST') {
		return data.carrierIds?.map((id) => ({
			type: 'CARRIER',
			carrierId: id,
		}));
	}

	return data.customerCompanyIds?.map((id) => ({
		type: 'CUSTOMER',
		customerCompanyId: id,
	}));
}

function parseTariffFile(file, structure: TariffStructure): ParsedTariffFile {
	const workbook = xlsx.readFile(file.path);

	if (structure === 'ALL_IN_ONE') {
		const sheets = { zones: 'Zóny', rates: 'Sazby' };
		validateSheetNames(workbook, Object.values(sheets));

		return {
			structure,
			data: parsePart(workbook, sheets.zones, sheets.rates),
		};
	}

	// structure === 'SPLIT'
	else {
		const sheets = {
			pickup: { zones: 'Zóny-svoz', rates: 'Sazby-svoz' },
			deliver: { zones: 'Zóny', rates: 'Sazby' },
		};

		// inner objects values from sheets
		const mandatory = Object.values(sheets).flatMap((s) => Object.values(s));

		validateSheetNames(workbook, mandatory);

		return {
			structure,
			pickup: parsePart(workbook, sheets.pickup.zones, sheets.pickup.rates),
			deliver: parsePart(workbook, sheets.deliver.zones, sheets.deliver.rates),
		};
	}
}

function parsePart(workbook: WorkBook, zonesName: string, ratesName: string) {
	const zonesSheet = findSheet(zonesName, workbook);
	const ratesSheet = findSheet(ratesName, workbook);

	return {
		zones: parseZones(zonesSheet),
		rates: parseRates(ratesSheet),
	};
}

function parseZones(sheet: WorkSheet): ZoneParsed[] {
	const zones: ZoneParsed[] = [];

	const range = xlsx.utils.decode_range(sheet['!ref']);
	const startCol = range.s.c;
	const endCol = range.e.c;
	const endRow = range.e.r;

	for (let col = startCol; col <= endCol; col += 2) {
		const label = getCell(sheet, 0, col); // label must be always in first row

		const zone: ZoneParsed = {
			label,
			ranges: [],
		};

		for (let row = 1; row <= endRow; row++) {
			const startCell = getCell(sheet, row, col);
			const endCell = getCell(sheet, row, col + 1);

			// skip empty rows
			if (!startCell && !endCell) continue;

			zone.ranges.push({ start: startCell, end: endCell });
		}

		// skip some ghost zones (excel sometimes has some cells that just become 'undefined' (e.g. when user wrongly removes the cell))
		if (zone.label !== undefined && zone.ranges.length > 0) {
			zones.push(zone);
		}
	}

	return zones;
}

function parseRates(sheet: WorkSheet): RatesParsed {
	const range = xlsx.utils.decode_range(sheet['!ref']);

	const thresholds: number[] = [];
	const prices: Record<string, number[]> = {};
	const headers: string[] = [];

	// get header (zones labels)
	for (let col = 1; col <= range.e.c; col++) {
		const label = getCell(sheet, 0, col);

		if (label) {
			headers.push(label);
			prices[label] = [];
		}
	}

	// parse rows -> threshhold + assign rate to zone label
	for (let row = 1; row <= range.e.r; row++) {
		const threshold = Number(getCell(sheet, row, 0));

		thresholds.push(threshold);

		headers.forEach((label, i) => {
			const price = Number(getCell(sheet, row, i + 1));
			prices[label].push(price);
		});
	}

	return { thresholds, prices };
}

function transformTariff(parsed, structure: TariffStructure) {
	if (structure === 'ALL_IN_ONE') {
		return [buildPart('ALL_IN_ONE', parsed.data)];
	}

	// SPLIT
	return [
		buildPart('PICKUP', parsed.pickup),
		buildPart('DELIVER', parsed.deliver),
	];
}

function buildPart(partType: TariffPartType, part: TariffPartParsed) {
	return {
		partType,

		zones: {
			create: part.zones.map((zone) => ({
				label: zone.label,

				ranges: {
					create: zone.ranges.map((r) => ({
						start: psc.safeParse(r.start).data,
						end: psc.safeParse(r.end).data,
					})),
				},

				rates: {
					create: buildRates(zone.label, part.rates),
				},
			})),
		},
	};
}

/* 
	example
	thresholds: 1 | 4 | 8 | 15
	rates (from-to): 1-1, 2-4, 5-8, 9-15
*/
function buildRates(label, rates: RatesParsed) {
	return rates.thresholds.map((to, i) => ({
		fromValue: to === 1 ? 1 : rates.thresholds[i - 1] + 1,
		toValue: to,
		price: rates.prices[label][i],
	}));
}

function getCell(sheet: WorkSheet, row: number, col: number) {
	const cell = sheet[xlsx.utils.encode_cell({ r: row, c: col })];
	return cell ? String(cell.v).trim() : undefined;
}

// helper to find sheet by case-insensitive name in given workbook
const findSheet = (name: string, workbook: WorkBook) => {
	return sheetExists(name, workbook) ? workbook.Sheets[name] : null;
};

// check if sheet name exists (case-insensitive)
const sheetExists = (name: string, workbook: WorkBook) => {
	return workbook.SheetNames.find(
		(sheetName) => sheetName.toLowerCase() === name.toLowerCase(),
	);
};

// helper to find additional sheet names (case-insensitive)
const additionalSheetNames = (workbook: WorkBook, mandatory: string[]) => {
	const mandatoryLower = new Set(mandatory.map((m) => m.toLowerCase()));

	return workbook.SheetNames.filter(
		(name) => !mandatoryLower.has(name.toLowerCase()),
	);
};

const validateSheetNames = (workbook: WorkBook, mandatory: string[]) => {
	let missingSheets: string[] = [];

	// mandatory sheets check
	for (const sheet of mandatory) {
		if (!sheetExists(sheet, workbook)) missingSheets.push(sheet);
	}

	// extra sheets check
	const extraSheets = additionalSheetNames(workbook, mandatory);

	if (missingSheets.length || extraSheets.length) {
		const allSheetNames = workbook.SheetNames;

		throw new RequestError(
			'Nesprávný format dat v souboru',
			HTTP.BAD_REQUEST,
			[
				missingSheets.length
					? `Chybí hárky: ${missingSheets.join(', ')}`
					: null,
				extraSheets.length
					? `Do vybrané struktury souboru nepatří hárky: ${extraSheets.join(', ')}`
					: null,
				`Všechny hárky v souboru jsou: ${allSheetNames.join(', ')}`,
			].filter(Boolean), // removes null
			ERROR_CODE.BAD_FILE_FORMAT,
		);
	}
};
