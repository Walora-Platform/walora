/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { requireAnyRole } from '../../middlewares/requireRole.js';
import {
	changeBillingBatchStatusController,
	exportBillingBatchController,
	getInvoiceDetailController,
	getInvoicesController,
	recalculateBillingBatchController,
	removeParcelFromBillingItemController,
	updateBillingBatchInvoiceNumberController,
	updateBillingItemFinalPriceController,
} from './billing.controller.js';

const router = Router();
router.use(requireAuth);
router.use(requireAnyRole('PROVIDER_ADMIN', 'PROVIDER_USER'));
router.use(requirePermission('INVOICES'));

// GET /billing/batches
router.get('/batches', getInvoicesController);

// GET /billing/batches/:id
router.get('/batches/:id', getInvoiceDetailController);

// PATCH /billing/items/:id/final-price
router.patch('/items/:id/final-price', updateBillingItemFinalPriceController);

// PATCH /billing/batches/:id/status
router.patch('/batches/:id/status', changeBillingBatchStatusController);

// PATCH /billing/batches/:id/invoice-number
router.patch(
	'/batches/:id/invoice-number',
	updateBillingBatchInvoiceNumberController,
);

// POST /billing/batches/:id/recalculate
router.post('/batches/:id/recalculate', recalculateBillingBatchController);

// GET /billing/batches/:id/export
router.get('/batches/:id/export', exportBillingBatchController);

// PATCH /billing/parcels/:id/remove-from-billing-item
router.patch(
	'/parcels/:id/remove-from-billing-item',
	removeParcelFromBillingItemController,
);

export default router;
