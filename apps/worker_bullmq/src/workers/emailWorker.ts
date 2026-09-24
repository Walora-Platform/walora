/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Worker } from 'bullmq';
import redisConnection from '../config/redis.js';
import prisma from '../config/prisma.js';

const emailWorker = new Worker(
	'email',
	async (job) => {
		console.log(`Processing email job: ${job.id}`, job.data);

		try {
			switch (job.name) {
				case 'welcome-email':
					await sendWelcomeEmail(job.data);
					break;
				case 'password-reset':
					await sendPasswordResetEmail(job.data);
					break;
				default:
					console.warn(`Unknown job type: ${job.name}`);
			}
		} catch (err) {
			console.error(`Failded to process job ${job.id}`, err);
			throw err; // will trigger retry
		}
	},
	{
		connection: redisConnection,
		concurrency: 5, // process 5 jobs concurrently
	},
);

async function sendWelcomeEmail(data: any) {
	const { userId, email, name } = data;

	// TODO: implement email service
	console.log(`Sending welcome email to ${email} - ${name}`);

	// simulate email sending for now
	await new Promise((resolve) => setTimeout(resolve, 1000));

	console.log(`Welcome email sent to ${email} - ${name}`);
}

async function sendPasswordResetEmail(data: any) {
	const { userId, email, resetToken } = data;

	// TODO: implement email service
	console.log(`Sending password reset email to ${email}`);

	await new Promise((resolve) => setTimeout(resolve, 1000));

	console.log(`Password reset email sent to ${email}`);
}

emailWorker.on('completed', (job) => {
	console.log(`Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
	console.error(`Job ${job?.id} failed:`, err);
});

export default emailWorker;
