/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import {
	getParcelsController,
	changeParcelsStatusController,
	changeParcelsProblemController,
	getDocumentByIdController,
	editParcelController,
	deleteParcelController,
	placeParcelsOrdersController,
	setInvoicedExternallyController,
} from './parcels.controller.js';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { requireAnyRole } from '../../middlewares/requireRole.js';
import { uploadToMemory } from '../../middlewares/multer.js';

const router = Router().use(requireAuth);

// GET /parcels -> used by both provider and customers
router.get(
	'/',
	requirePermission('CUSTOMER_PARCELS', 'PARCELS'),
	getParcelsController,
);

// DELETE /parcels -> used by ONLY PROVIDER
router.delete(
	'/',
	requireAnyRole('PROVIDER_USER', 'PROVIDER_ADMIN'),
	requirePermission('PARCELS'),
	deleteParcelController,
);

// PATCH /parcels/status -> used by provider only
router.patch(
	'/status',
	requireAnyRole('PROVIDER_USER', 'PROVIDER_ADMIN'),
	requirePermission('PARCELS'),
	changeParcelsStatusController,
);

// PATCH /parcels/problem -> used by provider only
router.patch(
	'/problem',
	requireAnyRole('PROVIDER_USER', 'PROVIDER_ADMIN'),
	requirePermission('PARCELS'),
	changeParcelsProblemController,
);

// PATCH /parcels/invoiced-externally
router.patch(
	'/invoiced-externally',
	requireAnyRole('PROVIDER_USER', 'PROVIDER_ADMIN'),
	requirePermission('PARCELS'),
	setInvoicedExternallyController,
);

// PATCH /parcels/:id -> edit parcel, used by provider only
router.patch(
	'/:id',
	requireAnyRole('PROVIDER_USER', 'PROVIDER_ADMIN'),
	requirePermission('PARCELS'),
	editParcelController,
);

// GET /parcels/document/:id
router.get(
	'/document/:id',
	requirePermission('PARCELS', 'CUSTOMER_PARCELS'),
	getDocumentByIdController,
);

// POST /parcels/orders
router.post(
	'/orders',
	requirePermission(
		'CUSTOMER_PARCELS_ORDERS_IMPORT', // customer
		'PARCELS_TRANSPORT_ORDERS', // provider
	),
	uploadToMemory.array('files'),
	placeParcelsOrdersController,
);

export default router;
