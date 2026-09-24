/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Worker } from 'bullmq';
import redisConnection from '../config/redis';
import prisma from '../config/prisma';
import { currentDateTimeString } from '../utils/currentDateTimeString';
import { getTodayDateUTCMidnight } from '../utils/dates';

const tariffsWorker = new Worker(
	'tariffs',
	async (job) => {
		try {
			switch (job.name) {
				case 'update-status': {
					const today = getTodayDateUTCMidnight();

					// INACTIVE UPDATE
					await prisma.tariff.updateMany({
						where: {
							validTo: { lt: today },
							status: { not: 'INACTIVE' },
						},
						data: { status: 'INACTIVE' },
					});

					// ACTIVE UPDATE
					await prisma.tariff.updateMany({
						where: {
							validFrom: { lte: today },
							OR: [{ validTo: null }, { validTo: { gte: today } }],
							status: { not: 'ACTIVE' },
						},
						data: { status: 'ACTIVE' },
					});
					break;
				}
				default:
					console.error('tariffsWorker unknown job name');
					break;
			}
		} catch (err) {
			console.error(`TariffsWorker - Failed to process job ${job.id}`, err);
			throw err;
		}
	},
	{
		connection: redisConnection,
	},
);

tariffsWorker.on('active', (job) =>
	console.log(
		`[ACTIVE] TariffsWorker ${job.opts.jobId} at ${currentDateTimeString()}`,
	),
);

tariffsWorker.on('completed', (job) =>
	console.log(
		`[COMPLETED] TariffsWorker ${job.opts.jobId} at ${currentDateTimeString()}`,
	),
);
export default tariffsWorker;
