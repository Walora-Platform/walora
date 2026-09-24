/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import prisma from '../../config/prisma.js';
import { z } from 'zod';
import { ParcelsSchema } from './extApi.validation.js';
import { parcelsQueue } from '../../queues/index.js';
import * as sequenceService from '../../services/sequenceService.js';
import { randomUUID } from 'crypto';

export async function addParcelsBulk(
	customerId: string,
	parcels: z.infer<typeof ParcelsSchema>,
) {
	// find the customer by id
	const customer = await prisma.customerCompany.findUnique({
		where: { id: customerId },
		select: {
			id: true,
			code: true,
		},
	});

	// get sequence numbers
	const sequenceNumbers = await sequenceService.allocateBulk(parcels.length);

	// add jobs to insert parcels in bulk + add sequenceNum to each parcel
	// 1 parcel per job, they will be processed 5 concurrently (see parcelQueue worker)
	await parcelsQueue.addBulk(
		parcels.map((parcel, i) => ({
			name: 'ext-api-insert-parcel',
			data: {
				customer,
				...parcel,
				sequenceNum: sequenceNumbers[i],
			},
			opts: {
				attempts: 5,
				backoff: {
					type: 'exponential',
					delay: 5000,
				},
				removeOnFail: false,
				removeOnComplete: true,
			},
		})),
	);

	// export to ERP job
	await parcelsQueue.add(
		'export-parcels-to-erp-smart4web',
		{
			customer,
			parcels,
			sequenceNumbers,
		},
		{
			jobId: randomUUID(),
			attempts: 5,
			backoff: {
				type: 'exponential',
				delay: 5000,
			},
			removeOnComplete: true,
			removeOnFail: false,
		},
	);
}
