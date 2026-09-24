/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import tariffsEndpoints from './modules/tariffs/tariffs.routes.js';
import authEndpoints from './modules/auth/auth.routes.js';
import carriersEndpoints from './modules/carriers/carriers.routes.js';
import parcelsEndpoints from './modules/parcels/parcels.routes.js';
import usersEndpoints from './modules/users/users.routes.js';
import dashboardEndpoints from './modules/dashboard/dashboard.routes.js';
import customersEndpoints from './modules/customers/customers.routes.js';
import customerBillingEndpoints from './modules/customerBilling/billing.routes.js';
import { globalErrorHandler } from './middlewares/globalErrorHandler.js';

import extApiEndpoints from './modules/extApi/extApi.routes.js';
import extApiDocs from './swagger.js';

import { billingQueue, documentsQueue, tariffsQueue } from './queues/index.js';
import prisma from './config/prisma.js';

// app + default middlewares to use
const app = express().use(express.json()).use(cookieParser());

/* FRONTEND ENDPOINTS */
app.use('/auth', authEndpoints); // e.g. POST /auth/login
app.use('/tariffs', tariffsEndpoints); // e.g. GET /tariffs
app.use('/carriers', carriersEndpoints); // e.g. GET /carrier/all
app.use('/parcels', parcelsEndpoints); // e.g. GET /parcels
app.use('/users', usersEndpoints); // e.g. GET /users (used by all admins (PROVIDER_ADMIN, CUSTOMER_ADMIN, ADMIN))
app.use('/dashboard', dashboardEndpoints); // e.g. GET /dashboard/kpis
app.use('/customers', customersEndpoints); // e.g. GET /customers
app.use('/billing', customerBillingEndpoints); // e.g. GET /billing/batches

app.use(globalErrorHandler);

/* CUSTOMER API ENDPOINTS */
app.use('/v1', extApiEndpoints); // e.g. POST /v1/parcels
app.use('/docs', extApiDocs); // /docs

/* RECURRENT JOBS FOR BULLMQ */
// remove job scheduler with: documentsQueue.removeJobScheduler(KEY)
await documentsQueue.upsertJobScheduler(
	'collect-unconfirmed-bill-of-lading', // KEY
	{
		// see https://github.com/harrisiirak/cron-parser for Cron Format (bullmq uses this under the hood)
		pattern: '*/11 * * * *', // every 11th minute of each hour
	},
	{
		name: 'collect-unconfirmed-bill-of-lading', // job.name in queue
	},
);

await documentsQueue.upsertJobScheduler(
	'collect-confirmed-bill-of-lading',
	{
		pattern: '*/10 * * * *', // every 10th minute of each hour
	},
	{
		name: 'collect-confirmed-bill-of-lading',
	},
);

// check if unconfirmed BOL was attached to each parcel with order date the day before
await documentsQueue.upsertJobScheduler(
	'check-unconfirmed-bill-of-lading-attached',
	{
		pattern: '10 0 * * *', // everyday at 00:10
	},
	{
		name: 'check-unconfirmed-bill-of-lading-attached',
	},
);

await tariffsQueue.upsertJobScheduler(
	'update-status',
	{
		pattern: '1 0 0 * * *', // everyday at 00:00:01
		tz: 'Europe/Prague',
	},
	{
		name: 'update-status',
	},
);

await billingQueue.upsertJobScheduler(
	'daily-billing',
	{
		pattern: '0 3 * * *', // everyday at 03:00
		tz: 'Europe/Prague',
	},
	{
		name: 'daily-billing',
	},
);

console.log(
	'\nActive recurrent jobs documentsQueue:\n',
	await documentsQueue.getJobSchedulers(),
);

console.log(
	'\nActive recurrent jobs tariffsQueue:\n',
	await tariffsQueue.getJobSchedulers(),
);

console.log(
	'\nActive recurrent jobs billingQueue:\n',
	await billingQueue.getJobSchedulers(),
);

/* EXPRESS SERVER START */
const PORT = process.env.BACKEND_PORT; // env variables are injected to container
app.listen(PORT, () => {
	console.log(`Backend running on port ${PORT}`);
});

/* async function resetBilling() {
	//	throw new Error('resetBilling?');
	await prisma.parcel.updateMany({ data: { billingItemId: null } });
	await prisma.billingItem.deleteMany();
	await prisma.billingBatch.deleteMany();
} */
