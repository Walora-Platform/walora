/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';

export const emailQueue = new Queue('email', {
	connection: redisConnection,
});

export const parcelsQueue = new Queue('parcels', {
	connection: redisConnection,
});

export const documentsQueue = new Queue('documents', {
	connection: redisConnection,
	defaultJobOptions: {
		attempts: 3, // retries 3x
		backoff: {
			type: 'exponential', // it will rise exponentially [ 2 ^ (attempts - 1) * delay ]
			delay: 10000, // 10, 20, 40 sec
		},
	},
});

export const tariffsQueue = new Queue('tariffs', {
	connection: redisConnection,
});

export const billingQueue = new Queue('billing', {
	connection: redisConnection,
});

console.log('Queues initialized');
