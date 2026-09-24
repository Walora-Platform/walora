/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Worker, Job, Queue, QueueEventsProducer } from 'bullmq';
import redisConnection from '../config/redis.js';
import prisma from '../config/prisma.js';
import { normalizeTime } from '../utils/normalizeTime.js';
import { ParcelStatus } from '../config/generated/prisma-client/enums.js';
import { getParcelSequenceNum } from '../utils/getParcelSequenceNum.js';
import { jsonRowsForExport } from '../utils/jsonRowsForExport.js';
import xlsx from 'xlsx';
import { Client } from 'basic-ftp';
import { createReadableStreamFrom } from '../utils/createReadableStreamFrom.js';

interface LocationContact {
	name?: string;
	phone?: string;
}

interface LocationDetails {
	date?: string;
	timeFrom?: string;
	timeTo?: string;
	name: string;
	streetAddress: string;
	city: string;
	psc: string;
	state: string;
	contact: LocationContact;
	note?: string;
}

interface InsertParcelJobData {
	customerCode: string;
	sequenceNum: number;
	payer?: string;
	parcelType?: string;
	billOfLadingNum?: string; // DL
	customerReference?: string;
	palletsCount?: number;
	palletSpacesCount?: number;
	weight?: number;
	temperatureMode?: string;
	pickup: LocationDetails;
	delivery: LocationDetails;
	createdAt?: string;
	status?: ParcelStatus;
}

const parcelsWorker = new Worker(
	'parcels',
	async (job) => {
		try {
			switch (job.name) {
				case 'ext-api-insert-parcel': {
					const parcel = job.data;

					console.log('Processing', job.name, 'on', parcel.sequenceNum);

					// create parcel
					await prisma.parcel.create({
						data: {
							customerId: parcel.customer.id,
							payer: parcel.customer.code,
							customerCode: parcel.customer.code,

							sequenceNum: parcel.sequenceNum,
							billOfLadingNum: parcel.billOfLading ?? null,
							reference: parcel.reference ?? null,

							palletsCount: parcel.palletsCount ?? null,
							palletSpacesCount: parcel.palletSpacesCount ?? null,
							weight: parcel.weight ?? null,
							volume: parcel.volume ?? null,
							temperatureMode: parcel.temperatureMode ?? null,

							cashOnDeliveryAmount: parcel.cashOnDelivery?.amount ?? null,
							cashOnDeliveryCurrency: parcel.cashOnDelivery?.currency ?? null,

							// PICKUP
							pickupDate: parcel.pickup.date,
							pickupTimeFrom: parcel.pickup.timeFrom ?? null,
							pickupTimeTo: parcel.pickup.timeTo ?? null,
							pickupName: parcel.pickup.name,
							pickupStreetAddress: parcel.pickup.streetAddress,
							pickupCity: parcel.pickup.city,
							pickupPsc: parcel.pickup.psc,
							pickupState: parcel.pickup.state,
							pickupContactName: parcel.pickup.contactName,
							pickupContactPhone: parcel.pickup.contactPhone,

							// DELIVERY
							deliveryDate: parcel.delivery.date,
							deliveryTimeFrom: parcel.delivery.timeFrom ?? null,
							deliveryTimeTo: parcel.delivery.timeTo ?? null,
							deliveryName: parcel.delivery.name,
							deliveryStreetAddress: parcel.delivery.streetAddress,
							deliveryCity: parcel.delivery.city,
							deliveryPsc: parcel.delivery.psc,
							deliveryState: parcel.delivery.state,
							deliveryContactName: parcel.delivery.contactName ?? null,
							deliveryContactPhone: parcel.delivery.contactPhone ?? null,
							deliveryNote: parcel.delivery.note ?? null,
						},
					});
					break;
				}
				case 'export-parcels-to-erp-smart4web': {
					const { customer, parcels, sequenceNumbers } = job.data;
					console.log('Processing', job.name, 'on', parcels.length, 'parcels');

					// map parcels to xlsx smart4web format
					const rows = jsonRowsForExport(customer, parcels, sequenceNumbers);

					// create xlsx sheet
					const sheet = xlsx.utils.json_to_sheet(rows, {
						origin: 1, // start at row index 1 (leaves the 0 index row empty)
					});

					const book = xlsx.utils.book_new();
					xlsx.utils.book_append_sheet(book, sheet, 'objednávky_vse');

					const buffer = xlsx.write(book, {
						type: 'buffer',
						bookType: 'xlsx',
					});

					// filename
					const filename = `export_${customer.code}_${job.id}.xlsx`;

					// ARCHIVE FTP
					const archiveFtp = new Client();

					// ERP FTP
					const erpFtp = new Client();

					try {
						// ARCHIVE FTP
						await archiveFtp.access({
							host: process.env.FTP_HOST,
							user: process.env.FTP_USER,
							password: process.env.FTP_PASSWORD,
						});

						// archive file
						await archiveFtp.ensureDir(process.env.FTP_IS_ORDERS_ARCHIVE);
						await archiveFtp.uploadFrom(
							createReadableStreamFrom(buffer),
							filename,
						);

						// ERP FTP
						await erpFtp.access({
							host: process.env.FTP_SMART4WEB_HOST,
							user: process.env.FTP_SMART4WEB_USER,
							password: process.env.FTP_SMART4WEB_PASSWORD,
						});

						// upload file
						await erpFtp.cd(process.env.FTP_SMART4WEB_PATH);
						await erpFtp.uploadFrom(createReadableStreamFrom(buffer), filename);
					} catch (err) {
						console.error('FTP ERROR');
						throw err;
					} finally {
						await archiveFtp.close();
						await erpFtp.close();
					}

					break;
				}

				// USED BY PARCEL IMPORT SERVICE (FTP)
				case 'insert-parcel': {
					const parcel = job.data;
					console.log('Processing', job.name, 'on', parcel.sequenceNum);

					await prisma.$transaction(async (tx) => {
						// find customer company
						const company = await tx.customerCompany.findUnique({
							where: { code: parcel.customerCode },
							select: { id: true },
						});

						await tx.parcel.create({
							data: {
								customerId: company?.id ?? null,
								customerCode: parcel.customerCode,
								sequenceNum: parcel.sequenceNum,
								payer: parcel.payer ?? null,

								type: parcel.parcelType ?? null,
								billOfLadingNum: parcel.billOfLadingNum ?? null,
								reference: parcel.customerReference ?? null,

								palletsCount: parcel.palletsCount ?? null,
								palletSpacesCount: parcel.palletSpacesCount ?? null,
								weight: parcel.weight ?? null,
								temperatureMode: parcel.temperatureMode ?? null,

								pickupDate: new Date(parcel.pickup.date) ?? null,
								pickupTimeFrom: normalizeTime(parcel.pickup.timeFrom) ?? null,
								pickupTimeTo: normalizeTime(parcel.pickup.timeTo) ?? null,
								pickupName: parcel.pickup.name,
								pickupStreetAddress: parcel.pickup.streetAddress,
								pickupCity: parcel.pickup.city,
								pickupPsc: parcel.pickup.psc,
								pickupState: parcel.pickup.state,
								pickupContactName: parcel.pickup.contact.name
									? String(parcel.pickup.contact.name)
									: null,
								pickupContactPhone: parcel.pickup.contact.phone
									? String(parcel.pickup.contact.phone)
									: null,

								deliveryDate: new Date(parcel.delivery.date) ?? null,
								deliveryTimeFrom:
									normalizeTime(parcel.delivery.timeFrom) ?? null,
								deliveryTimeTo: normalizeTime(parcel.delivery.timeTo) ?? null,
								deliveryName: parcel.delivery.name,
								deliveryStreetAddress: parcel.delivery.streetAddress,
								deliveryCity: parcel.delivery.city,
								deliveryPsc: parcel.delivery.psc,
								deliveryState: parcel.delivery.state,
								deliveryContactName: parcel.delivery.contact.name
									? String(parcel.delivery.contact.name)
									: null,
								deliveryContactPhone: parcel.delivery.contact.phone
									? String(parcel.delivery.contact.phone)
									: null,
								deliveryNote: parcel.delivery.note ?? null,
								createdAt: parcel.createdAt, // if createdAt is undefined -> default(now) will be used
								status: parcel.status, // if status is undefined -> default from database is used
							},
						});
					});
					break;
				}

				// USED BY MANUAL IMPORT SCRIPT
				case 'insert-historic-parcels-from-manual-import': {
					const parcel = job.data;
					console.log('Processing', job.name, 'on', parcel.sequenceNum);

					await prisma.$transaction(async (tx) => {
						// find customer company
						const company = await tx.customerCompany.findUnique({
							where: { code: parcel.customerCode },
							select: { id: true },
						});

						// find parcel carrier
						const carrier = await tx.carrier.findUnique({
							where: { name: parcel.carrierName },
							select: { id: true },
						});

						await tx.parcel.create({
							data: {
								status: parcel.status, // if status is undefined -> default from database is used
								customerId: company?.id ?? null,
								customerCode: parcel.customerCode,
								type: parcel.type ?? null,
								sequenceNum: parcel.sequenceNum,
								payer: parcel.payer ?? null,

								selectedCarrierId: carrier?.id ?? null,
								createdAt: parcel.createdAt, // if createdAt is undefined -> default(now) will be used
								billOfLadingNum: parcel.billOfLadingNum ?? null,
								reference: parcel.customerReference ?? null,

								palletsCount: parcel.palletsCount ?? null,
								palletSpacesCount: parcel.palletSpacesCount ?? null,
								weight: parcel.weight ?? null,
								volume: parcel.volume ?? null,
								temperatureMode: parcel.temperatureMode ?? null,

								cashOnDeliveryAmount: parcel.codAmount ?? null,
								cashOnDeliveryCurrency: parcel.codCurrency ?? null,
								cashOnDeliveryPaidOutDate: parcel.codPaidOutDate ?? null,
								note: parcel.note ?? null,

								pickupDate: new Date(parcel.pickup.date) ?? null,
								pickupTimeFrom: normalizeTime(parcel.pickup.timeFrom) ?? null,
								pickupTimeTo: normalizeTime(parcel.pickup.timeTo) ?? null,
								pickupName: parcel.pickup.name,
								pickupStreetAddress: parcel.pickup.streetAddress,
								pickupCity: parcel.pickup.city,
								pickupPsc: parcel.pickup.psc,
								pickupState: parcel.pickup.state,
								pickupContactName: parcel.pickup.contact.name
									? String(parcel.pickup.contact.name)
									: null,
								pickupContactPhone: parcel.pickup.contact.phone
									? String(parcel.pickup.contact.phone)
									: null,

								deliveryDate: new Date(parcel.delivery.date) ?? null,
								deliveryTimeFrom:
									normalizeTime(parcel.delivery.timeFrom) ?? null,
								deliveryTimeTo: normalizeTime(parcel.delivery.timeTo) ?? null,
								deliveryName: parcel.delivery.name,
								deliveryStreetAddress: parcel.delivery.streetAddress,
								deliveryCity: parcel.delivery.city,
								deliveryPsc: parcel.delivery.psc,
								deliveryState: parcel.delivery.state,
								deliveryContactName: parcel.delivery.contact.name
									? String(parcel.delivery.contact.name)
									: null,
								deliveryContactPhone: parcel.delivery.contact.phone
									? String(parcel.delivery.contact.phone)
									: null,
								deliveryNote: parcel.delivery.note ?? null,
							},
						});
					});
					break;
				}
				default:
					console.warn(`ParcelsWorker - Unknown job type: ${job.name}`);
			}
		} catch (err) {
			console.error(`ParcelsWorker - Failded to process job ${job.id}`, err);
			throw err; // will trigger retry
		}
	},
	{
		connection: redisConnection,
		concurrency: 5, // process 5 jobs concurrently
	},
);

parcelsWorker.on('completed', (job) => {
	console.log(`'${job.name}' ${job.data.sequenceNum} completed`);
});

parcelsWorker.on('failed', (job, err) => {
	console.error(`'${job?.name}' ${job?.data.sequenceNum} failed:`, err);
});

parcelsWorker.on('error', (job, err) => {
	console.error(
		`PARCEL WORKER ERROR '${job?.name}' ${job?.data?.sequenceNum} failed:`,
		err,
	);
});

export default parcelsWorker;
