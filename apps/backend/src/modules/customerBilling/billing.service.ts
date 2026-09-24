/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import path from 'path';
import ExcelJS from 'exceljs';
import prisma from '../../config/prisma.js';
import { RequestError } from '../../errors/RequestError.js';
import HTTP from '../../utils/constants/httpCodes.js';
import { formatDbDate } from '../../utils/datetimes.js';
import {
	BillingBatchStatus,
	PrismaClient,
} from '../../config/generated/prisma-client/client.js';
import { billingQueue } from '../../queues/index.js';
import { QueueEvents } from 'bullmq';
import redisConnection from '../../config/redis.js';

const EXPORT_TEMPLATE_PATH = path.join(
	process.cwd(),
	'src/modules/customerBilling/templates/priloha_k_fakture.template.xlsx',
);

// fixed position of the template's style-donor / first data row
const EXPORT_DATA_START_ROW = 4;

const billingQueueEvents = new QueueEvents('billing', {
	connection: redisConnection,
});

/* ChatGPT generated Prisma Transaction type */
type PrismaTx = Omit<
	PrismaClient,
	'$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function getInvoices(query) {
	const page = Number(query.page ?? 0);
	const pageSize = Number(query.pageSize ?? 20);

	const [data, total] = await prisma.$transaction([
		prisma.billingBatch.findMany({
			include: {
				customerCompany: { select: { name: true, code: true } },
				tariff: { select: { name: true } },
			},
			omit: {
				tariffId: true,
				customerCompanyId: true,
			},
			take: pageSize,
			skip: page * pageSize,
			orderBy: { createdAt: 'desc' },
		}),
		prisma.billingBatch.count(),
	]);

	return { data, total };
}

export async function getInvoiceDetails(id: string) {
	const [batch, items] = await prisma.$transaction([
		// batch
		prisma.billingBatch.findUnique({
			where: { id },
			include: {
				customerCompany: { select: { name: true, code: true } },
				tariff: { select: { name: true } },
			},
			omit: {
				tariffId: true,
				customerCompanyId: true,
			},
		}),

		// items
		prisma.billingItem.findMany({
			where: { billingBatchId: id },
			omit: { billingBatchId: true },
			include: {
				parcels: {
					select: {
						id: true,
						billOfLadingNum: true,
						problem: true,
						status: true,
						palletsCount: true,
						palletSpacesCount: true,
						weight: true,
						temperatureMode: true,

						createdAt: true,
						pickupDate: true,
						deliveryDate: true,
						deliveryName: true,
						deliveryStreetAddress: true,
						deliveryCity: true,
						deliveryPsc: true,
						deliveryState: true,
					},
					orderBy: { palletSpacesCount: 'desc' },
				},
			},
		}),
	]);

	const mappedItems = items.map((item) => {
		const problemCount = item.parcels.filter((p) => p.problem == true).length;

		const undeliveredCount = item.parcels.filter(
			(p) => p.status !== 'DELIVERED',
		).length;

		const warnings = { problemCount, undeliveredCount };

		return {
			...item,
			warnings,
		};
	});

	// sort items in desc order
	mappedItems.sort((a, b) => {
		const aParcel = a.parcels[0];
		const bParcel = b.parcels[0];

		const aPickupDate = aParcel?.pickupDate?.getTime() ?? 0;
		const bPickupDate = bParcel?.pickupDate?.getTime() ?? 0;

		// b - a = descending order based on pickup date
		if (aPickupDate !== bPickupDate) {
			// newest pickup date first
			return bPickupDate - aPickupDate;
		}

		const aDeliveryDate = aParcel?.deliveryDate?.getTime() ?? 0;
		const bDeliveryDate = bParcel?.deliveryDate?.getTime() ?? 0;

		// descending order -> b - a
		// based on delivery date of items with the same pickup date
		if (aDeliveryDate !== bDeliveryDate) {
			return bDeliveryDate - aDeliveryDate;
		}

		// if both pickup and delivery date are the same on 2 compared items
		// desc order based on palletSpacesSum
		return Number(b.palletSpacesSum ?? 0) - Number(a.palletSpacesSum ?? 0);
	});

	return { items: mappedItems, batch };
}

export async function updateBillingItemFinalPrice(
	billingItemId: string,
	finalPrice: string | number,
) {
	if (!billingItemId) {
		throw new RequestError(
			'Pro změnu ceny fakturační položky je nutné zadat její id',
		);
	}

	const parsedFinalPrice = Number(finalPrice);

	if (isNaN(parsedFinalPrice)) {
		throw new RequestError('Finální cena neni číslo');
	}

	if (parsedFinalPrice < 0) {
		throw new RequestError('Finální cena nemůže být záporná');
	}

	return await prisma.$transaction(async (tx) => {
		const item = await tx.billingItem.findUnique({
			where: { id: billingItemId },
			select: {
				id: true,
				billingBatchId: true,
				billingBatch: {
					select: { status: true },
				},
			},
		});

		if (!item) {
			throw new RequestError('Fakturační položka nebyla nalezena');
		}

		if (item.billingBatch.status === 'FINALIZED') {
			throw new RequestError('Cenu nelze upravit u uzavřené faktury');
		}

		// update finalPrice + set overridden flag
		await tx.billingItem.update({
			where: { id: billingItemId },
			data: {
				finalPrice: parsedFinalPrice,
				finalPriceOverridden: true,
			},
		});

		const batchResult = await recalculateBillingBatchTotals(
			tx,
			item.billingBatchId,
		);
	});
}

export async function updateBillingBatchInvoiceNumber(
	id: string,
	invoiceNumber: string,
) {
	if (!id) {
		throw new RequestError(
			'Pro nastavení čísla faktury je nutné zadat id fakturační dávky.',
		);
	}

	const trimmed = typeof invoiceNumber === 'string' ? invoiceNumber.trim() : '';

	if (!trimmed) {
		throw new RequestError('Číslo faktury nesmí být prázdné.');
	}

	const batch = await prisma.billingBatch.findUnique({
		where: { id },
		select: { id: true, status: true },
	});

	if (!batch) {
		throw new RequestError('Fakturační dávka nebyla nalezena.', HTTP.NOT_FOUND);
	}

	if (batch.status === 'FINALIZED') {
		throw new RequestError('Číslo faktury nelze upravit u uzavřené faktury.');
	}

	await prisma.billingBatch.update({
		where: { id },
		data: { invoiceNumber: trimmed },
	});
}

export async function changeBillingBatchStatus(
	id: string,
	status: BillingBatchStatus,
) {
	if (!id) {
		throw new RequestError(
			'Pro změnu stavu fakturační dávky je nutné zadat id.',
		);
	}

	if (!['DRAFT', 'FINALIZED'].includes(status)) {
		throw new RequestError('Neplatný stav fakturační dávky.');
	}

	const batch = await prisma.billingBatch.findUnique({
		where: { id },
		select: {
			id: true,
			status: true,
			hasErrors: true,
			totalParcels: true,
			invoiceNumber: true,
		},
	});

	if (!batch) {
		throw new RequestError('Fakturační dávka nebyla nalezena.', HTTP.NOT_FOUND);
	}

	if (batch.status === status) return;

	const statusFinalized = status === 'FINALIZED';

	if (statusFinalized && batch.totalParcels === 0) {
		throw new RequestError(
			'Fakturační dávku nelze uzavřít, protože neobsahuje žádné zásilky.',
		);
	}

	if (statusFinalized && !batch.invoiceNumber) {
		throw new RequestError(
			'Fakturační dávku nelze uzavřít, dokud není zadáno číslo faktury.',
		);
	}

	await prisma.billingBatch.update({
		where: { id },
		data: {
			status,
			finalizedAt: statusFinalized ? new Date() : null,
		},
	});

	// send the invoice number + invoiced parcels to Smart4Web ERP
	if (statusFinalized) {
		await billingQueue.add(
			'export-invoice-to-erp-smart4web',
			{ billingBatchId: id },
			{
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 10000, // 10, 20, 40 sec
				},
			},
		);
	}
}

export async function removeParcelFromBillingItem(parcelId: string) {
	if (!parcelId) {
		throw new RequestError('Pro odebrání zásilky je nutné zadat její id');
	}

	return await prisma.$transaction(async (tx) => {
		const parcel = await tx.parcel.findUnique({
			where: { id: parcelId },
			select: {
				id: true,
				billingItem: {
					select: {
						id: true,
						billingBatch: {
							select: {
								id: true,
								status: true,
							},
						},
					},
				},
			},
		});

		if (!parcel) {
			throw new RequestError('Zásilka nebyla nalezena', HTTP.NOT_FOUND);
		}

		if (!parcel.billingItem) {
			throw new RequestError('Zásilka není součástí fakturační položky.');
		}

		if (parcel.billingItem.billingBatch.status === 'FINALIZED') {
			throw new RequestError(
				'Zásilku nelze odebrat z uzavřené fakturační dávky.',
			);
		}

		// remove parcel from billing item
		await tx.parcel.update({
			where: { id: parcel.id },
			data: { billingItemId: null },
		});

		const billingItemId = parcel.billingItem.id;
		const billingBatchId = parcel.billingItem.billingBatch.id;

		// check if its needed to recalculate
		const remainingParcelsCount = await tx.parcel.count({
			where: { billingItemId },
		});

		let removedBillingItemId: string | null = null;

		if (remainingParcelsCount !== 0) {
			await recalculateBillingItemTotals(tx, billingItemId);
		} else {
			await tx.billingItem.delete({
				where: { id: billingItemId },
			});

			removedBillingItemId = billingItemId;
		}

		const batchResult = await recalculateBillingBatchTotals(tx, billingBatchId);

		return {
			removedParcelId: parcel.id,
			removedBillingItemId,
			removedBillingBatchId: batchResult.deleted ? billingBatchId : null,
		};
	});
}

export async function recalculateBillingItemTotals(
	tx: PrismaTx,
	billingItemId: string,
) {
	const item = await tx.billingItem.findUnique({
		where: { id: billingItemId },
		select: {
			id: true,
			pricePerPallet: true,
			finalPrice: true,
			finalPriceOverridden: true,
			parcels: {
				select: {
					id: true,
					palletsCount: true,
					palletSpacesCount: true,
				},
			},
		},
	});

	if (!item) return null;

	if (item.parcels.length === 0) {
		return { empty: true };
	}

	let palletsSum: number = 0;
	let palletSpacesSum: number = 0;

	// calculate new palletsSum and palletSpacesSum
	for (const parcel of item.parcels) {
		palletsSum += Number(parcel.palletsCount);
		palletSpacesSum += Number(parcel.palletSpacesCount);
	}

	const pricePerPallet = item.pricePerPallet ?? 0;
	const tariffPrice = pricePerPallet * palletsSum;

	await tx.billingItem.update({
		where: { id: billingItemId },
		data: {
			palletsSum,
			palletSpacesSum,
			tariffPrice,

			// wont override final price that was once changed by user
			finalPrice: item.finalPriceOverridden ? item.finalPrice : tariffPrice,
		},
	});

	return {
		empty: false,
	};
}

export async function recalculateBillingBatchTotals(
	tx: PrismaTx,
	billingBatchId: string,
) {
	const batch = await tx.billingBatch.findUnique({
		where: { id: billingBatchId },
		select: {
			id: true,
			errorCode: true,
			billingItems: {
				select: {
					id: true,
					finalPrice: true,
					palletsSum: true,
					palletSpacesSum: true,
					errorCode: true,
					parcels: {
						select: {
							id: true,
						},
					},
				},
			},
		},
	});

	if (!batch) {
		throw new RequestError('Fakturační dávka nebyla nalezena.', HTTP.NOT_FOUND);
	}

	// remove whole billingBatch if there is no billingItems in it
	if (batch.billingItems.length === 0) {
		await tx.billingBatch.delete({
			where: { id: billingBatchId },
		});

		return { deleted: true };
	}

	let totalPallets: number = 0;
	let totalParcels: number = 0;
	let totalPalletSpaces: number = 0;
	let totalPrice: number = 0;
	let hasErrors: boolean = false;

	for (const item of batch.billingItems) {
		totalPallets += item.palletsSum;
		totalParcels += item.parcels.length;
		totalPalletSpaces += Number(item.palletSpacesSum);
		totalPrice += Number(item.finalPrice);

		if (item.errorCode) hasErrors = true;
	}

	// update totals
	await tx.billingBatch.update({
		where: { id: billingBatchId },
		data: {
			totalPrice,
			totalPalletSpaces,
			totalParcels,
			totalPallets,
			hasErrors,
		},
	});

	return {
		deleted: false,
	};
}

export async function recalculateBillingBatch(id) {
	if (!id) {
		throw new RequestError(
			'Pro přepočet fakturační dávky je nutné zadat její id.',
		);
	}

	const job = await billingQueue.add(
		'recalculate-billing-batch',
		{ billingBatchId: id },
		{
			jobId: `recalculate-billing-batch-${id}`,
			attempts: 1,
			removeOnComplete: true,
		},
	);

	const res = await job.waitUntilFinished(billingQueueEvents, 30_000);
	return res;
}

export async function generateBillingBatchXlsx(billingBatchId: string) {
	if (!billingBatchId) {
		throw new RequestError('Pro export je nutné zadat id fakturační dávky.');
	}

	const batch = await prisma.billingBatch.findUnique({
		where: { id: billingBatchId },
		select: {
			periodTo: true,
			invoiceNumber: true,
			customerCompany: { select: { code: true } },
			billingItems: {
				select: {
					finalPrice: true,
					parcels: {
						select: {
							customerCode: true,
							sequenceNum: true,
							billOfLadingNum: true,
							pickupDate: true,
							deliveryName: true,
							deliveryCity: true,
							deliveryPsc: true,
							deliveryState: true,
							palletsCount: true,
							palletSpacesCount: true,
							weight: true,
							volume: true,
							cashOnDeliveryAmount: true,
						},
						// same ordering as getInvoiceDetails - the first (largest) parcel
						// in the group carries the whole group's price, rest get 0,
						// matching how the company already builds this sheet by hand
						orderBy: { palletSpacesCount: 'desc' },
					},
				},
			},
		},
	});

	if (!batch) {
		throw new RequestError('Fakturační dávka nebyla nalezena.', HTTP.NOT_FOUND);
	}

	const rows = batch.billingItems.flatMap((item) => {
		const finalPrice = Number(item.finalPrice);

		return item.parcels.map((parcel, i) => ({
			...parcel,
			rowPrice: i === 0 ? finalPrice : 0,
		}));
	});

	if (rows.length === 0) {
		throw new RequestError(
			'Fakturační dávka neobsahuje žádné zásilky k exportu.',
		);
	}

	// chronological order, matching the reference file
	rows.sort((a, b) => {
		const aTime = a.pickupDate?.getTime() ?? 0;
		const bTime = b.pickupDate?.getTime() ?? 0;

		if (aTime !== bTime) return aTime - bTime;

		return (a.billOfLadingNum ?? '').localeCompare(b.billOfLadingNum ?? '');
	});

	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.readFile(EXPORT_TEMPLATE_PATH);
	const sheet = workbook.getWorksheet('List1');

	if (!sheet) {
		throw new Error('Šablona pro export neobsahuje list "List1".');
	}

	// fill invoice number
	sheet.getCell('B1').value = batch.invoiceNumber;

	const numRows = rows.length;
	const dataStart = EXPORT_DATA_START_ROW;
	const dataEnd = dataStart + numRows - 1;

	// clone the style-donor row's style for every extra parcel row needed
	if (numRows > 1) {
		sheet.duplicateRow(dataStart, numRows - 1, true);
	}

	rows.forEach((row, i) => {
		const r = dataStart + i;

		sheet.getCell(`A${r}`).value = `${row.customerCode}${row.sequenceNum}`;
		sheet.getCell(`B${r}`).value = row.billOfLadingNum;
		sheet.getCell(`C${r}`).value = row.pickupDate;
		sheet.getCell(`D${r}`).value = row.deliveryName;
		sheet.getCell(`E${r}`).value = row.deliveryCity;
		sheet.getCell(`F${r}`).value = row.deliveryPsc;
		sheet.getCell(`G${r}`).value = row.deliveryState;
		sheet.getCell(`H${r}`).value = row.palletsCount ?? 0;
		sheet.getCell(`I${r}`).value = row.palletSpacesCount
			? Number(row.palletSpacesCount)
			: 0;
		sheet.getCell(`J${r}`).value = row.weight ? Number(row.weight) : 0;
		sheet.getCell(`K${r}`).value = row.volume ? Number(row.volume) : 0;
		sheet.getCell(`L${r}`).value = row.cashOnDeliveryAmount
			? Number(row.cashOnDeliveryAmount)
			: 0;
		sheet.getCell(`M${r}`).value = row.rowPrice;
		sheet.getCell(`N${r}`).value = { formula: `M${r}`, result: row.rowPrice };
	});

	const totalsRow = dataEnd + 2;
	const fuelRow = totalsRow + 2;
	const fmCreditRow = fuelRow + 1;
	const grandRow = fmCreditRow + 2;

	sheet.getCell(`H${totalsRow}`).value = {
		formula: `SUM(H${dataStart}:H${dataEnd})`,
	};
	sheet.getCell(`I${totalsRow}`).value = {
		formula: `SUM(I${dataStart}:I${dataEnd})`,
	};
	sheet.getCell(`J${totalsRow}`).value = {
		formula: `SUM(J${dataStart}:J${dataEnd})`,
	};
	sheet.getCell(`K${totalsRow}`).value = {
		formula: `SUM(K${dataStart}:K${dataEnd})`,
	};
	sheet.getCell(`N${totalsRow}`).value = {
		formula: `SUM(N${dataStart}:N${dataEnd})`,
	};

	sheet.getCell(`N${fuelRow}`).value = {
		formula: `ROUND(N${totalsRow}*B${fuelRow},0)`,
	};
	sheet.getCell(`N${fmCreditRow}`).value = {
		formula: `ROUND((N${totalsRow}+N${fuelRow})*4%,0)`,
	};
	sheet.getCell(`N${grandRow}`).value = {
		formula: `SUM(N${totalsRow},N${fuelRow},N${fmCreditRow})`,
	};

	const buffer = await workbook.xlsx.writeBuffer();
	const filename = `Priloha_k_fakture_${batch.customerCompany.code}_${formatDbDate(batch.periodTo)}.xlsx`;

	return { buffer, filename };
}
