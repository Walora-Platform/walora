/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Worker } from 'bullmq';
import redisConnection from '../config/redis';
import { getTodayDateUTCMidnight } from '../utils/dates';
import prisma from '../config/prisma';
import * as billingService from '../services/billing/billing.service';
import { currentDateTimeString } from '../utils/currentDateTimeString';

const billingWorker = new Worker(
	'billing',
	async (job) => {
		try {
			switch (job.name) {
				case 'daily-billing': {
					// DO NOT CHANGE, today must be UTC midnight
					const today = getTodayDateUTCMidnight();

					const customers = await prisma.customerCompany.findMany({
						where: { billingMode: { not: 'NONE' } },
						select: {
							id: true,
							billingDayOfMonth: true,
							billingMode: true,
							code: true,
						},
					});

					for (const customer of customers) {
						if (!billingService.shouldRunBillingToday(customer, today)) {
							continue;
						}

						await billingService.createPeriodicBillingBatch(customer, today);
					}
					break;
				}

				case 'after-each-billing': {
					const { parcelId } = job.data;
					await billingService.createAfterEachBillingBatch(parcelId);
					break;
				}

				case 'recalculate-billing-batch': {
					const { billingBatchId } = job.data;
					return await billingService.recalculateBillingBatch(billingBatchId);
				}

				case 'export-invoice-to-erp-smart4web': {
					const { billingBatchId } = job.data;

					console.log('BILLING WORKER - export-invoice-to-erp-smart4web');
					await billingService.exportInvoiceToErpSmart4Web(billingBatchId);
					break;
				}

				case 'create-billing-batch-for-period': {
					const { customerCode, periodFrom, periodTo } = job.data as {
						customerCode: string;
						periodFrom: string;
						periodTo: string;
					};

					await billingService.createBillingBatchForPeriod({
						customerCode,
						periodFrom: new Date(`${periodFrom}T00:00:00.000Z`),
						periodTo: new Date(`${periodTo}T00:00:00.000Z`),
					});

					break;
				}

				default:
					console.log('BillingWorker - Unknown job', job.name);
			}
		} catch (err) {
			console.error(`BillingWorker - Failed to process job ${job.id}`, err);
			throw err;
		}
	},
	{
		connection: redisConnection,
		concurrency: 1,
	},
);

billingWorker.on('active', (job) =>
	console.log(
		`[ACTIVE] BillingWorker ${job.name} at ${currentDateTimeString()}`,
	),
);

billingWorker.on('completed', (job) =>
	console.log(
		`[COMPLETED] BillingWorker ${job.name} at ${currentDateTimeString()}`,
	),
);

export default billingWorker;
