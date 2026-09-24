/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import prisma from '../../config/prisma.js';
import xlsx from 'xlsx';
import { ParcelStatus } from '../../config/generated/prisma-client/enums.js';
import { ParcelScalarFieldEnum } from '../../config/generated/prisma-client/internal/prismaNamespaceBrowser.js';
import { validateParcelUpdate } from './parcels.validation.js';
import MIME from '../../utils/constants/mimeTypes.js';
import {
	ParcelsSchema,
	ParcelSchema,
	LocationSchema,
} from '../extApi/extApi.validation.js';
import z, { ZodError } from 'zod';
import { cs } from 'zod/locales';
import { addParcelsBulk } from '../extApi/extApi.service.js';
import { formatDate, formatDbDate, formatTime } from '../../utils/datetimes.js';
import { RequestError } from '../../errors/RequestError.js';
import HTTP from '../../utils/constants/httpCodes.js';
import { billingQueue } from '../../queues/index.js';

z.config(cs());

type FileResult =
	| {
			id: string;
			filename: string;
			status: 'error';
			errors: string[];
	  }
	| {
			id: string;
			filename: string;
			status: 'success';
			ordersCount: number;
	  };

type FileBase = {
	id: string;
	filename: string;
};

const currencySymbol = {
	CZK: 'Kč',
	EUR: '€',
} as const;

export async function getParcels(query, user) {
	if (!query) throw new Error('Query not provided');
	if (!user) throw new Error('User not provided');

	const page = Number(query.page ?? 0);
	const pageSize = Number(query.pageSize ?? 25);

	const where = {};

	const isProvider = user.permissions.includes('PARCELS');
	const isCustomer = user.permissions.includes('CUSTOMER_PARCELS');

	// set customerId for customers
	if (isCustomer && !isProvider) {
		where.customerId = user.customerCompanyId;
	}

	// set specific customerId (from query) when provider
	if (query.customerCompanyId && isProvider) {
		where.customerId = query.customerCompanyId;
	}

	// filters
	if (query.status) where.status = query.status;
	if (query.onlyProblem === 'true') where.problem = true;
	if (query.customer && isProvider) {
		where.customer = {
			code: {
				equals: query.customer.trim(),
				mode: 'insensitive',
			},
		};
	}

	// global search (OR)
	if (query.globalFilter) {
		const q = query.globalFilter;
		where.OR = [
			{ billOfLadingNum: { contains: q, mode: 'insensitive' } },
			{ reference: { contains: q, mode: 'insensitive' } },
			{ deliveryName: { contains: q, mode: 'insensitive' } },
			{ deliveryCity: { contains: q, mode: 'insensitive' } },
			{ deliveryStreetAddress: { contains: q, mode: 'insensitive' } },
		];
	}

	// premade presets for most wanted searches
	applyPreset(where, query.preset);

	const allowedSort = ['createdAt', 'pickupDate', 'deliveryDate'];
	let sortField = allowedSort.includes(query.sortField)
		? query.sortField
		: 'createdAt';

	// 1 = 'asc | -1 = 'desc'
	// 'desc' is default
	const sortOrder = Number(query.sortOrder) === 1 ? 'asc' : 'desc';

	// include more info for provider
	const customerDetails = { select: { id: true, name: true, code: true } };
	const carrierDetails = { select: { id: true, name: true } };
	const billingDetails = {
		select: {
			billingBatch: {
				select: {
					periodTo: true,
					customerCompany: { select: { code: true } },
				},
			},
		},
	};

	const [parcels, total] = await prisma.$transaction([
		prisma.parcel.findMany({
			where,
			skip: page * pageSize,
			take: pageSize,
			orderBy: [{ [sortField]: sortOrder }, { sequenceNum: sortOrder }],
			omit: {
				customerId: true,
				customerCode: true,
				payer: true,
				selectedCarrierId: true,
				billingItemId: true,
				invoicedExternallyAt: isCustomer,
			},
			include: {
				customer: isProvider ? customerDetails : false,
				selectedCarrier: isProvider ? carrierDetails : false,
				billingItem: isProvider ? billingDetails : false,
				documents: {
					omit: {
						parcelId: true,
						path: true,
					},
				},
			},
		}),
		prisma.parcel.count({ where }),
	]);

	const data = parcels.map((parcel) => {
		const billingBatch = parcel.billingItem?.billingBatch;

		const codAmount = parcel.cashOnDeliveryAmount;
		const codCurrency = parcel.cashOnDeliveryCurrency;
		const codPaidOutDate = parcel.cashOnDeliveryPaidOutDate;

		delete parcel.cashOnDeliveryAmount;
		delete parcel.cashOnDeliveryCurrency;

		return {
			...parcel,
			cashOnDelivery: {
				amount: codAmount,
				currencySymbol: currencySymbol[codCurrency] ?? codCurrency,
				currencyCode: codCurrency,
			},
			orderedAt: {
				date: formatDate(parcel.createdAt),
				time: formatTime(parcel.createdAt),
			},
			invoiceNumber: billingBatch
				? createInvoiceNumber(
						billingBatch.customerCompany.code,
						billingBatch.periodTo,
					)
				: undefined,
		};
	});

	return { data, total };
}

function createInvoiceNumber(customerCode: string, periodTo: Date) {
	return `${customerCode}_${formatDbDate(periodTo)}`;
}

export async function getDocumentById(id: string, user) {
	if (!id) throw new Error('id not provided');
	if (!user) throw new Error('user not provided');

	// get the document + document.parcel.customerId
	const document = await prisma.document.findUnique({
		where: { id },
		select: {
			path: true,
			originalName: true,
			parcel: { select: { customerId: true } },
		},
	});

	if (!document) return null;

	const isProvider = user.permissions.includes('PARCELS');
	const isCustomer = user.permissions.includes('CUSTOMER_PARCELS');

	const canCustomerGetThisDocument =
		isCustomer && user.customerCompanyId === document.parcel.customerId;

	if (!isProvider && !canCustomerGetThisDocument)
		throw new Error('User can not get this document');

	return document;
}

// change status on array of parcel ids
export async function changeParcelsStatus(
	parcelIds: string[],
	newStatus: ParcelStatus,
) {
	if (!parcelIds) throw new Error('missing parcelIds');
	if (!newStatus) throw new Error('missing newStatus');

	// find existing parcels with given parcelIds (sanitizes ids from not existing)
	const parcels = await getOnlyExistingParcelsFromIds(parcelIds, {
		id: true,
		status: true,
		billingItemId: true,
	});

	const billedParcels = parcels.filter((p) => p.billingItemId);

	// billed parcels can be changed to 'DELIVERED' only
	if (billedParcels.length > 0 && newStatus !== 'DELIVERED') {
		throw new RequestError(
			'Nelze změnit stav vybraných zásilek',
			HTTP.BAD_REQUEST,
			[
				`Z vybraných zásilek je ${billedParcels.length} součástí fakturace.`,
				'Fakturovaným zásilkám lze změnit stav pouze na Doručeno.',
			],
		);
	}

	const toUpdate = parcels.filter((p) => p.status !== newStatus);
	const unchangedCount = parcels.length - toUpdate.length;

	// bulk update
	if (toUpdate.length > 0) {
		await prisma.parcel.updateMany({
			where: {
				id: {
					in: toUpdate.map((p) => p.id),
				},
			},
			data: {
				status: newStatus,
			},
		});
	}

	// offload AFTER_EACH billing mode to bullmq_worker job
	if (newStatus === 'DELIVERED' && toUpdate.length > 0) {
		await Promise.all(
			toUpdate.map((parcel) =>
				billingQueue.add(
					'after-each-billing', // job name
					{ parcelId: parcel.id },
					{
						jobId: `after-each-${parcel.id}`,
						attempts: 3,
						backoff: {
							type: 'exponential',
							delay: 5000,
						},
						removeOnComplete: true,
					},
				),
			),
		);
	}

	return {
		updatedCount: toUpdate.length,
		unchangedCount,
	};
}

// change 'problem' column on Parcel for array of parcel ids
export async function changeParcelsProblem(
	parcelIds: string[],
	problem: boolean,
) {
	if (!parcelIds) throw new Error('missing parcelIds');
	if (problem == undefined) throw new Error('missing param problem');

	const parcels = await getOnlyExistingParcelsFromIds(parcelIds, {
		id: true,
		problem: true,
	});

	const toUpdate = parcels.filter((p) => p.problem !== problem);
	const unchangedCount = parcels.length - toUpdate.length;

	// bulk update
	if (toUpdate.length > 0) {
		await prisma.parcel.updateMany({
			where: {
				id: {
					in: toUpdate.map((p) => p.id),
				},
			},
			data: {
				problem,
			},
		});
	}

	return {
		updatedCount: toUpdate.length,
		unchangedCount,
	};
}

export async function editParcel(id: string, data: object) {
	if (!id) throw new Error('missing id');
	if (!data) throw new Error('missing payload');

	const billedParcel = await prisma.parcel.findUnique({
		where: { id, billingItemId: { not: null } },
	});

	if (billedParcel) {
		throw new RequestError(
			'Nelze upravit stav vybrané zásilky, protože se již nachází ve fakturaci',
		);
	}

	const errors = validateParcelUpdate(data);
	if (errors) return { errors };

	data.pickupDate = new Date(data.pickupDate);
	data.deliveryDate = new Date(data.deliveryDate);

	if (data.cashOnDeliveryPaidOutDate) {
		data.cashOnDeliveryPaidOutDate = new Date(data.cashOnDeliveryPaidOutDate);
	}

	await prisma.parcel.update({
		where: { id },
		data,
	});

	return `Successfully edited parcel '${id}'.`;
}

export async function deleteParcel(id: string) {
	if (!id) throw new Error('missing id');

	const billedParcel = await prisma.parcel.findUnique({
		where: { id, billingItemId: { not: null } },
	});

	if (billedParcel) {
		throw new RequestError(
			'Nelze smazat vybranou zásilku, protože se již nachází ve fakturaci',
		);
	}

	await prisma.parcel.delete({
		where: { id },
	});

	return `Successfully deleted parcel '${id}'`;
}

export async function setInvoicedExternally(
	parcelIds: string[],
	setTo: 'on' | 'off',
) {
	if (!parcelIds?.length) {
		throw new RequestError('Vyberte alespoň jednu zásilku.');
	}

	if (!['on', 'off'].includes(setTo)) {
		throw new RequestError('Neplatná hodnota nastavení externí fakturace.');
	}

	const parcels = await prisma.parcel.findMany({
		where: {
			id: { in: parcelIds },
		},
		select: {
			id: true,
			billingItemId: true,
			invoicedExternallyAt: true,

			/* for errors */
			billOfLadingNum: true,
			sequenceNum: true,
			status: true,
		},
	});

	if (parcels.length === 0) {
		throw new RequestError('Nebyla nalezena žádná zásilka.');
	}

	if (setTo === 'on') {
		const internallyInvoiced = parcels.filter((p) => p.billingItemId);
		const cancelled = parcels.filter((p) => p.status === 'CANCELLED');

		if (internallyInvoiced.length > 0) {
			const details = internallyInvoiced.map((p) => {
				let d = 'Zásilka ';

				if (p.billOfLadingNum) d += p.billOfLadingNum;
				else d += String(p.sequenceNum);

				return (d += ' je již součástí fakturace v systému.');
			});
			throw new RequestError(
				'Externí fakturaci nelze nastavit u zásilek již fakturovaných v systému.',
				HTTP.BAD_REQUEST,
				details,
			);
		}

		if (cancelled.length > 0) {
			const details = cancelled.map((p) => {
				let d = 'Zásilka ';

				if (p.billOfLadingNum) d += p.billOfLadingNum;
				else d += String(p.sequenceNum);

				return (d += ' byla již zrušena.');
			});
			throw new RequestError(
				'Externí fakturaci nelze nastavit u zrušených zásilek.',
				HTTP.BAD_REQUEST,
				details,
			);
		}
	}

	// on -> set new Date
	// off -> set null
	const invoicedExternallyAt = setTo === 'on' ? new Date() : null;

	const result = await prisma.parcel.updateMany({
		where: {
			id: {
				in: parcels.map((p) => p.id),
			},
			status: { not: 'CANCELLED' },
		},
		data: { invoicedExternallyAt },
	});

	return { updatedCount: result.count };
}

export async function processFiles(
	customerCompanyId,
	files: Express.Multer.File[],
	fileIds: string[],
) {
	const results: FileResult[] = [];

	for (const [i, file] of files.entries()) {
		const fileBase: FileBase = {
			id: fileIds[i],
			filename: file.originalname,
		};

		// MIME check
		if (file.mimetype !== MIME.XLSX) {
			results.push({
				...fileBase,
				errors: ['Neočekávaný typ souboru'],
				status: 'error',
			});

			// go to next file
			continue;
		}

		try {
			const HEADER_ROW_INDEX = 3; // 0-based, excel row 4

			// parse xlsx
			const book = xlsx.read(file.buffer, { type: 'buffer' });
			const sheet = book.Sheets[book.SheetNames[0]];
			const rawRows = xlsx.utils.sheet_to_json(sheet, {
				range: HEADER_ROW_INDEX,
			});

			if (!rawRows.length) {
				results.push({
					...fileBase,
					errors: ['Soubor neobsahuje ani jednu zásilku'],
					status: 'error',
				});

				continue;
			}

			// map headers (CZ -> EN)
			const mappedRows = rawRows.map(mapRow);

			// validate
			const parsed = ParcelsSchema.safeParse(mappedRows);

			if (!parsed.success) {
				let errors = [];
				errors.push(
					...parsed.error.issues.map((e) => {
						const path = e.path;

						if (path.length) {
							const parcelIndex = path[0] + 1;
							let columnName = enToCsColumn(path);
							const expectedType = e.expected;
							const receivedType = e.received;
							let errorDetails = '';

							const topPath = path[1]; // e.g. 'cashOnDelivery'
							const nestedPath = path[2]; // e.g. 'currency'
							const supportedValues = e?.values;

							// Cash On Delivery
							if (topPath === 'cashOnDelivery') {
								if (nestedPath === 'amount') {
									columnName = 'COD';
									errorDetails =
										'je očekávano nenulové číslo. Pokud si nepřejete zadat dobírku, nevyplňujte ani jedno z COD (Dobírka suma) nebo COD_MEN (Dobírka měna).';
								}

								if (nestedPath === 'currency') {
									columnName = 'COD_MENA';

									if (supportedValues) {
										errorDetails = `je neplatná možnost. Podporované jsou: ${supportedValues.join(', ')}`;
									}
								}
							}

							// expected types
							else if (expectedType === 'string')
								errorDetails = 'očekávan řetězec znaků';
							else if (expectedType === 'number')
								errorDetails = 'očekávano číslo';

							// received types
							if (receivedType === 'NaN')
								errorDetails += ', obdrženou hodnotou neni číslo';
							else if (receivedType)
								errorDetails += `, obdržena byla hodnota typu "${receivedType}"`;

							// default
							if (errorDetails === '') errorDetails = e.message;

							console.log(e);

							return `Zásilka ${parcelIndex}: v sloupci ${columnName} ${errorDetails}`;
						} else return 'Neznáma chyba';
					}),
				);

				// remove null and undefined errors
				errors = errors.filter((e) => !!e);

				results.push({
					...fileBase,
					errors: errors,
					status: 'error',
				});

				// go to next file
				continue;
			}

			const parcels = parsed.data;

			// insert parcels
			await addParcelsBulk(customerCompanyId, parcels);

			results.push({
				...fileBase,
				ordersCount: parcels.length,
				status: 'success',
			});
		} catch (err) {
			console.log(err);

			results.push({
				...fileBase,
				errors: ['Nepodařilo se spracovat soubor'],
				status: 'error',
			});
		}
	}

	return results;
}

const s = (c: unknown) => {
	if (c === null || c === undefined) return undefined;

	const value = String(c).trim();
	return value === '' ? undefined : value;
};

const n = (c: any) => {
	if (c === null || c === undefined || c === '') return undefined;

	const value = Number(c);
	return Number.isFinite(value) ? value : undefined;
};

function mapCashOnDelivery({ amount, currency }) {
	if (amount === undefined && currency === undefined) {
		return undefined;
	}

	return {
		amount,
		currency,
	};
}

/* maps each xlsx row to ParcelSchema */
function mapRow(row: any): z.input<typeof ParcelSchema> {
	return {
		billOfLading: s(row['DODACI_LIST']),
		reference: s(row['REFERENCE']),
		palletsCount: n(row['POCET']),
		palletSpacesCount: n(row['POCET_LM']),
		weight: n(row['VAHA']),
		volume: n(row['OBJEM']),
		temperatureMode: s(row['TEPLOTA']),
		cashOnDelivery: mapCashOnDelivery({
			amount: row['COD'],
			currency: row['COD_MENA'],
		}),
		codAmount: n(row['COD']),
		codCurrency: s(row['COD_MENA']),
		pickup: {
			date: s(row['DATUM_NAKLADKA']),
			timeFrom: s(row['CAS_NAKLADKA']),
			timeTo: s(row['CAS_NAKLADKA_DO']),
			name: s(row['NAKLADKA_NAZEV']),
			streetAddress: s(row['NAKLADKA_ULICE']),
			city: s(row['NAKLADKA_MESTO']),
			psc: s(row['NAKLADKA_PSC']),
			state: s(row['NAKLADKA_STAT']),
			contactName: s(row['NAKLADKA_KONTAKT']),
			contactPhone: s(row['NAKLADKA_TELEFON']),
		},
		delivery: {
			date: s(row['DATUM_VYKLADKA']),
			timeFrom: s(row['CAS_VYKLADKA']),
			timeTo: s(row['CAS_VYKLADKA_DO']),
			name: s(row['VYKLADKA_NAZEV']),
			streetAddress: s(row['VYKLADKA_ULICE']),
			city: s(row['VYKLADKA_MESTO']),
			psc: s(row['VYKLADKA_PSC']),
			state: s(row['VYKLADKA_STAT']),
			contactName: s(row['VYKLADKA_KONTAKT']),
			contactPhone: s(row['VYKLADKA_TEL']),
			note: s(row['POZN_DORUCENI']),
		},
	};
}

const enParcelCommonToCs: Record<keyof z.infer<typeof ParcelSchema>, string> = {
	billOfLading: 'DODACI_LIST',
	reference: 'REFERENCE',
	palletsCount: 'POCET',
	palletSpacesCount: 'POCET_LM',
	weight: 'VAHA',
	volume: 'OBJEM',
	temperatureMode: 'TEPLOTA',
	pickup: 'NAKLADKA',
	delivery: 'VYKLADKA',
};

function enToCsColumn(path: (string | number)[]): string {
	if (path.length === 2) {
		return enParcelCommonToCs[path[1]] ?? path[1];
	}

	if (path.length === 3) {
		let column = '';
		const common: z.infer<typeof ParcelSchema> = enParcelCommonToCs[path[1]];

		const locDetail: z.infer<typeof LocationSchema> = path[2];

		switch (locDetail) {
			case 'date':
				column += `DATUM_${common}`;
				break;

			case 'timeFrom':
				column += `CAS_${common}`;
				break;

			case 'timeTo':
				column += `CAS_${common}_DO`;
				break;

			case 'name':
				column += `${common}_NAZEV`;
				break;

			case 'streetAddress':
				column += `${common}_ULICE`;
				break;

			case 'city':
				column += `${common}_MESTO`;
				break;

			case 'psc':
				column += `${common}_PSC`;
				break;

			case 'state':
				column += `${common}_STAT`;
				break;

			case 'contactName':
				column += `${common}_KONTAKT`;
				break;

			case 'contactPhone':
				if (common === 'NAKLADKA') column += `${common}_TELEFON`;
				if (common === 'VYKLADKA') column += `${common}_TEL`;
				break;

			default:
				column = '(neznámy)';
				break;
		}
		return column;
	}
}

// find existing parcels with given parcelIds (sanitizes ids from not existing)
async function getOnlyExistingParcelsFromIds(
	parcelIds: string[],
	select: { [key: ParcelScalarFieldEnum]: boolean },
) {
	return prisma.parcel.findMany({
		where: {
			id: {
				in: parcelIds,
			},
		},
		select: select,
	});
}

function applyPreset(where, preset) {
	if (!preset) return;

	// TODO: define presets
	switch (preset) {
	}
}
