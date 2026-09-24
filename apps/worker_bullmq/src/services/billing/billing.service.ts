/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import xlsx from 'xlsx';
import { Client } from 'basic-ftp';
import prisma from '../../config/prisma';
import { currentDateTimeString } from '../../utils/currentDateTimeString';
import { createReadableStreamFrom } from '../../utils/createReadableStreamFrom';
import {
	BillingBatchErrorCode,
	BillingItemErrorCode,
	BillingMode,
} from '../../config/generated/prisma-client/enums';
import {
	Parcel,
	PrismaClient,
} from '../../config/generated/prisma-client/client';
import { addDays, toDateOnlyPrague } from '../../utils/dates';

// column layout required by Smart4Web's invoicing import ('S4WData' sheet)
const S4W_INVOICE_FIELD_HEADERS = [
	'ID_ZASILKA',
	'CENA_ZASILKA_P',
	'TRZBA_PREPRAVNE_FA',
	'FA_VYDANA',
];

export interface CustomerBillingInfo {
	id: string;
	code: string;
	billingMode: BillingMode;
	billingDayOfMonth: number | null;
}

interface ParcelsGroup {
	deliveryPsc: string;
	parcelIds: string[];
	palletsSum: number;
	palletSpacesSum: number;
}

interface LastBatchPeriodTo {
	periodTo: Date;
}

interface CreateBillingBatchInput {
	customerId: string;
	parcels: Parcel[];
	periodFrom: Date;
	periodTo: Date;
}

interface TariffCalculation {
	zoneLabel?: string;
	pricePerPallet?: number;
	totalPrice: number;
	errorCode?: BillingItemErrorCode;
}

interface FillBillingBatchWithItemsInput {
	billingBatchId: string;
	customerId: string;
	parcels: Parcel[];
}

/* ChatGPT generated Prisma Transaction type */
type PrismaTx = Omit<
	PrismaClient,
	'$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export function shouldRunBillingToday(
	customer: CustomerBillingInfo,
	today: Date,
): boolean {
	const todayDate = today.getUTCDate();

	switch (customer.billingMode) {
		case 'MONTHLY_DAY': {
			const step = customer.billingDayOfMonth;

			if (!step) {
				console.error(
					'Customer has billing mode MONTHLY_DAY, but billingDayOfMonth is not set',
					customer,
				);

				return false;
			}

			if (step === 1) return true;

			const lastDayOfMonthDate = getLastDayOfMonthDate(today);
			if (todayDate === lastDayOfMonthDate) return true; // today is the last day of month

			const isRegularPeriodEnd = todayDate % step === 0;
			if (!isRegularPeriodEnd) return false; // today is not the last day of billing period

			// but if today is the last day of billing period then:
			// billing should not run on 30. if 31. is the last day of month
			// waits for one more day, so billing would not run 2 days in row
			const isDayBeforeMonthEnd = todayDate + 1 === lastDayOfMonthDate;

			return !isDayBeforeMonthEnd;
		}

		case 'MONTH_END':
			return todayDate === 1; // billing last month always on 1. of current month

		case 'AFTER_EACH':
			// handled after each parcel that is DELIVERED on customer with AFTER_EACH setting
			return false;

		default:
			return false;
	}
}

export async function createPeriodicBillingBatch(
	customer: CustomerBillingInfo,
	today: Date,
) {
	const { periodFrom, periodTo } = await getBillingPeriod(customer, today);

	const parcels = await prisma.parcel.findMany({
		where: {
			customerId: customer.id,
			pickupDate: { lte: periodTo },
			status: { not: 'CANCELLED' },
			billingItemId: null, // not billed internally
			invoicedExternallyAt: null, // not billed externally
		},
	});

	if (!parcels.length) {
		console.log(
			`(${customer.code}) No billing batch created (no parcels for billing LessThanOrEqual ${periodTo.toISOString().split('T')[0]})`,
		);
		return;
	}

	await createBillingBatchFromParcels({
		customerId: customer.id,
		parcels,
		periodFrom,
		periodTo,
	});
}

export async function createAfterEachBillingBatch(parcelId: string) {
	const parcel = await prisma.parcel.findUnique({
		where: { id: parcelId },
		include: {
			customer: {
				select: { id: true, billingMode: true },
			},
		},
	});

	if (
		!parcel ||
		!parcel.customer ||
		parcel.customer.billingMode !== 'AFTER_EACH' ||
		parcel.status !== 'DELIVERED' ||
		parcel.billingItemId ||
		parcel.invoicedExternallyAt ||
		!parcel.deliveryDate
	) {
		return;
	}

	await createBillingBatchFromParcels({
		customerId: parcel.customer.id,
		parcels: [parcel],
		periodFrom: parcel.deliveryDate,
		periodTo: parcel.deliveryDate,
	});
}

async function createBillingBatchFromParcels(input: CreateBillingBatchInput) {
	const { customerId, parcels, periodFrom, periodTo } = input;

	if (!parcels.length) return;

	await prisma.$transaction(async (tx) => {
		const batch = await tx.billingBatch.create({
			data: {
				customerCompanyId: customerId,
				periodFrom,
				periodTo,

				totalPrice: 0,
				totalPalletSpaces: 0,
				totalPallets: 0,
				totalParcels: 0,
			},
		});

		await fillBillingBatchWithItems(tx, {
			billingBatchId: batch.id,
			customerId,
			parcels,
		});
	});
}

export async function recalculateBillingBatch(id: string) {
	if (!id) {
		throw new Error('Pro přepočet fakturační dávky je nutné zadat její id.');
	}

	const batch = await prisma.billingBatch.findUnique({
		where: { id },
		select: {
			id: true,
			customerCompanyId: true,
			periodFrom: true,
			periodTo: true,
			status: true,
		},
	});

	if (!batch) {
		throw new Error('Fakturační dávka nebyla nalezena.');
	}

	if (batch.status === 'FINALIZED') {
		throw new Error('Uzavřenou fakturační dávku nelze přepočítat.');
	}

	const data = await prisma.$transaction(async (tx) => {
		const parcels = await tx.parcel.findMany({
			where: {
				customerId: batch.customerCompanyId,
				pickupDate: { lte: batch.periodTo },
				status: { not: 'CANCELLED' },
				invoicedExternallyAt: null,
				OR: [
					{ billingItemId: null }, // new ones
					{
						// already in billingBatch
						billingItem: {
							billingBatchId: batch.id,
						},
					},
				],
			},
		});

		// remove parcels already present in this batch
		await tx.parcel.updateMany({
			where: {
				billingItem: {
					billingBatchId: batch.id,
				},
			},
			data: { billingItemId: null },
		});

		await tx.billingItem.deleteMany({
			where: {
				billingBatchId: batch.id,
			},
		});

		if (!parcels.length) {
			await tx.billingBatch.delete({
				where: { id: batch.id },
			});

			return { deleted: true };
		}

		await fillBillingBatchWithItems(tx, {
			billingBatchId: batch.id,
			customerId: batch.customerCompanyId,
			parcels,
		});

		return { deleted: false };
	});

	return data;
}

export async function createBillingBatchForPeriod(input: {
	customerCode: string;
	periodFrom: Date;
	periodTo: Date;
}) {
	const { customerCode, periodFrom, periodTo } = input;

	const customer = await prisma.customerCompany.findUnique({
		where: { code: customerCode },
		select: {
			id: true,
			code: true,
		},
	});

	if (!customer) {
		throw new Error(`Customer with code ${customerCode} not found`);
	}

	const existingBatch = await prisma.billingBatch.findFirst({
		where: {
			customerCompanyId: customer.id,
			periodFrom,
			periodTo,
		},
		select: { id: true },
	});

	if (existingBatch) {
		throw new Error(
			`Billing batch already exists for ${customerCode} ${periodFrom.toISOString().slice(0, 10)} -${periodTo.toISOString().slice(0, 10)}`,
		);
	}

	const parcels = await prisma.parcel.findMany({
		where: {
			customerId: customer.id,
			pickupDate: {
				gte: periodFrom,
				lte: periodTo,
			},
			status: { not: 'CANCELLED' },
			billingItemId: null,
			invoicedExternallyAt: null,
		},
	});

	if (!parcels.length) {
		console.log(
			`(${customer.code}) No parcels found for period ${periodFrom.toISOString().slice(0, 10)} - ${periodTo.toISOString().slice(0, 10)}`,
		);

		return;
	}

	await createBillingBatchFromParcels({
		customerId: customer.id,
		parcels,
		periodFrom,
		periodTo,
	});
}

export async function exportInvoiceToErpSmart4Web(billingBatchId: string) {
	const batch = await prisma.billingBatch.findUnique({
		where: { id: billingBatchId },
		select: {
			invoiceNumber: true,
			customerCompany: { select: { code: true } },
			billingItems: {
				select: {
					finalPrice: true,
					parcels: {
						select: { sequenceNum: true },
						// same ordering as generateBillingBatchXlsx (backend) /
						// getInvoiceDetails - the first (largest) parcel in the
						// group carries the whole group's price, rest get 0
						orderBy: { palletSpacesCount: 'desc' },
					},
				},
			},
		},
	});

	if (!batch) {
		throw new Error(`Billing batch ${billingBatchId} not found`);
	}

	if (!batch.invoiceNumber) {
		throw new Error(
			`Billing batch ${billingBatchId} has no invoice number set`,
		);
	}

	const parcels = batch.billingItems.flatMap((item) => item.parcels);

	if (!parcels.length) {
		console.log(
			`(${batch.customerCompany.code}) No parcels to export to Smart4Web for billing batch ${billingBatchId}`,
		);
		return;
	}

	// same convention as generateBillingBatchXlsx (billing.service.ts, backend):
	// the first (largest) parcel in the group carries the whole group's price,
	// the rest get 0
	const rows = batch.billingItems.flatMap((item) => {
		const finalPrice = Number(item.finalPrice);

		return item.parcels.map((parcel, i) => {
			const rowPrice = i === 0 ? finalPrice : 0;

			return [
				`${batch.customerCompany.code}${parcel.sequenceNum}`,
				rowPrice,
				rowPrice,
				batch.invoiceNumber,
			];
		});
	});

	const sheet = xlsx.utils.aoa_to_sheet([
		[], // leave the first row empty
		S4W_INVOICE_FIELD_HEADERS,
		...rows,
	]);

	const book = xlsx.utils.book_new();
	xlsx.utils.book_append_sheet(book, sheet, 'S4WData');

	const buffer = xlsx.write(book, {
		type: 'buffer',
		bookType: 'xlsx',
	});

	const filename = `fakturace_${batch.customerCompany.code}_${batch.invoiceNumber}_${formatFilenameTimestamp(new Date())}.xlsx`;

	const erpFtp = new Client();

	try {
		await erpFtp.access({
			host: process.env.FTP_SMART4WEB_HOST,
			user: process.env.FTP_SMART4WEB_USER,
			password: process.env.FTP_SMART4WEB_PASSWORD,
		});

		await erpFtp.cd(process.env.FTP_SMART4WEB_PATH);
		await erpFtp.uploadFrom(createReadableStreamFrom(buffer), filename);
	} catch (err) {
		console.error('FTP ERROR (exportInvoiceToErpSmart4Web)', err);
		throw err;
	} finally {
		await erpFtp.close();
	}
}

// !! handle 0 parcels before calling this function
async function fillBillingBatchWithItems(
	tx: PrismaTx,
	input: FillBillingBatchWithItemsInput,
) {
	const { billingBatchId, customerId, parcels } = input;

	// !! handle 0 parcels before calling this function
	if (!parcels.length) return;

	const tariff = await getActiveTariff(tx, customerId);
	const groups = groupParcels(parcels);

	const batchTotal = {
		price: 0,
		pallets: 0,
		parcels: 0,
		palletSpaces: 0,
		hasErrors: false,
	};

	for (const group of groups) {
		const result: TariffCalculation = tariff
			? calculateTariffPrice(group, tariff)
			: { totalPrice: 0 };

		batchTotal.price += result.totalPrice;
		batchTotal.parcels += group.parcelIds.length;
		batchTotal.pallets += group.palletsSum;
		batchTotal.palletSpaces += group.palletSpacesSum;

		if (result.errorCode) batchTotal.hasErrors = true;

		const item = await tx.billingItem.create({
			data: {
				billingBatchId,
				zoneLabel: result?.zoneLabel ?? null,
				deliveryPsc: group.deliveryPsc,
				errorCode: result.errorCode,
				tariffPrice: result.totalPrice,
				finalPrice: result.totalPrice,
				pricePerPallet: result?.pricePerPallet ?? null,
				palletsSum: group.palletsSum,
				palletSpacesSum: group.palletSpacesSum,
			},
		});

		await tx.parcel.updateMany({
			where: {
				id: { in: group.parcelIds },
				billingItemId: null,
				invoicedExternallyAt: null,
			},
			data: { billingItemId: item.id },
		});
	}

	// updated created billingBatch after calculating all items
	await tx.billingBatch.update({
		where: { id: billingBatchId },
		data: {
			tariffId: tariff?.id ?? null,
			errorCode: tariff ? null : 'TARIFF_NOT_FOUND',

			totalPrice: batchTotal.price,
			totalPalletSpaces: batchTotal.palletSpaces,
			totalParcels: batchTotal.parcels,
			totalPallets: batchTotal.pallets,
			hasErrors: batchTotal.hasErrors,
		},
	});
}

async function getBillingPeriod(customer: CustomerBillingInfo, today: Date) {
	const lastBatch: LastBatchPeriodTo | null =
		await prisma.billingBatch.findFirst({
			where: { customerCompanyId: customer.id },
			orderBy: { periodTo: 'desc' },
			select: { periodTo: true },
		});

	switch (customer.billingMode) {
		case 'MONTHLY_DAY':
			return {
				periodFrom: getMonthlyDayPeriodFrom(customer, lastBatch, today),
				periodTo: today,
			};
		case 'MONTH_END':
			return {
				periodFrom: getMonthEndPeriodFrom(lastBatch, today),
				periodTo: today,
			};

		default:
			throw new Error(
				`Unsupported billing mode (getBillingPeriod()): ${customer.billingMode}`,
			);
	}
}

function getMonthlyDayPeriodFrom(
	customer: CustomerBillingInfo,
	lastBatch: LastBatchPeriodTo | null,
	periodTo: Date,
) {
	// there is a lastBatch (its not first billing)
	if (lastBatch) return addDays(lastBatch.periodTo, 1);

	// otherwise, its the first billing for the customer and the periodFrom is calculated
	const step = customer.billingDayOfMonth;
	const day = periodTo.getUTCDate();
	const periodStartDate = Math.floor((day - 1) / step) * step + 1;

	return new Date(
		Date.UTC(
			periodTo.getUTCFullYear(),
			periodTo.getUTCMonth(),
			periodStartDate,
		),
	);
}

function getMonthEndPeriodFrom(
	lastBatch: LastBatchPeriodTo | null,
	periodTo: Date,
) {
	// there is a lastBatch (its not first billing)
	if (lastBatch) return addDays(lastBatch.periodTo, 1);

	// first billing (return -> previous month first day)
	return new Date(
		Date.UTC(periodTo.getUTCFullYear(), periodTo.getUTCMonth(), 1),
	);
}

function groupParcels(parcels: Parcel[]): ParcelsGroup[] {
	const map = new Map();

	for (const p of parcels) {
		// create parcel grouping key
		const key = [
			toDateOnlyPrague(p.createdAt), // compare date, not time
			p.pickupDate,
			p.deliveryDate,
			p.deliveryName,
			p.deliveryCity,
			p.deliveryPsc,
		].join('|');

		// check if group key already exists
		if (!map.has(key)) {
			map.set(key, <ParcelsGroup>{
				parcelIds: [],
				palletsSum: 0,
				palletSpacesSum: 0,
				deliveryPsc: p.deliveryPsc,
			});
		}

		// find the key, add parcel and update group's totalPallets
		const group: ParcelsGroup = map.get(key);
		group.parcelIds.push(p.id);
		group.palletsSum += p.palletsCount ?? 0;
		group.palletSpacesSum += !isNaN(Number(p.palletSpacesCount))
			? Number(p.palletSpacesCount)
			: 0;
	}

	return Array.from(map.values());
}

// CONSTRAINT: ALL_IN_ONE structure only
function calculateTariffPrice(
	group: ParcelsGroup,
	tariff: Awaited<ReturnType<typeof getActiveTariff>>,
): TariffCalculation {
	const r: TariffCalculation = { totalPrice: 0 };
	const part = tariff.parts[0];

	const zone = findZone(tariff.parts[0].zones, group.deliveryPsc);
	if (!zone) {
		r.errorCode = 'ZONE_NOT_FOUND';
		return r;
	}

	r.zoneLabel = zone.label;

	const rate = findRate(zone.rates, group.palletSpacesSum);
	if (!rate) {
		r.errorCode = 'RATE_NOT_FOUND';
		return r;
	}

	r.pricePerPallet = rate.price;
	r.totalPrice = rate.price * group.palletSpacesSum;
	return r;
}

// CONSTRAINT: ALL_IN_ONE structure only
async function getActiveTariff(tx: PrismaTx, customerId: string) {
	return await tx.tariff.findFirst({
		where: {
			status: 'ACTIVE',
			structure: 'ALL_IN_ONE',
			purpose: 'REVENUE',
			tariffSubjects: {
				some: { customerCompanyId: customerId },
			},
		},
		select: {
			id: true,
			name: true,
			parts: {
				include: {
					zones: {
						select: {
							label: true,
							ranges: true,
							rates: true,
						},
					},
				},
			},
		},
	});
}

function findZone(zones, psc: string) {
	const pscNum = Number(psc.replace(/\s/g, ''));

	return zones.find((zone) =>
		zone.ranges.some(
			(r) => pscNum >= Number(r.start) && pscNum <= Number(r.end),
		),
	);
}

function findRate(rates, palletSpaces) {
	return rates.find(
		(r) => palletSpaces >= r.fromValue && palletSpaces <= r.toValue,
	);
}

function getLastDayOfMonthDate(date: Date) {
	// last day of month (0. day of the next month is the last day of this month)
	const d = new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
	);

	return d.getUTCDate();
}

// dd-mm-yyyy_hh-mm-ss in Europe/Prague TZ
function formatFilenameTimestamp(date: Date): string {
	const parts = new Intl.DateTimeFormat('cs-CZ', {
		timeZone: 'Europe/Prague',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	}).formatToParts(date);

	const get = (type: string) => parts.find((p) => p.type === type)?.value;

	return `${get('day')}-${get('month')}-${get('year')}_${get('hour')}-${get('minute')}-${get('second')}`;
}
