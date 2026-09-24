/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requirePermission } from '../../middlewares/requirePermission.js';
import {
	getCustomersController,
	generateApiKeyController,
	manageApiKeyController,
	addCustomerController,
	updateCustomerBillingSettingsController,
	getCustomerProfileController,
	patchCustomerController,
	deleteCustomerController,
} from './customers.controller.js';
import { requireAnyRole } from '../../middlewares/requireRole.js';

const router = Router();
router.use(requireAuth);
router.use(requireAnyRole('PROVIDER_ADMIN', 'PROVIDER_USER'));
router.use(requirePermission('CUSTOMERS'));

/*  ------ BASE ------ */
router.get('/', getCustomersController); // GET /customers
router.get('/reduced', getCustomersController); // GET /customers/reduced
router.get('/:id', getCustomerProfileController); // GET /customers/:id

router.post('/', addCustomerController); // POST /customers (to add a new customer)

router.patch('/:id', patchCustomerController); // PATCH /customers/:id

router.delete('/:id', deleteCustomerController); // DELETE /customers/:id

/*  ------ API KEYS ------ */
router.post('/:id/api-key', generateApiKeyController); // POST /customers/:id/api-key (to add API key to a customer)
router.patch('/api-key/:keyId', manageApiKeyController); // PATCH /customers/api-key/:keyId

/*  ------ BILLING SETTINGS ------ */
// PATCH /customers/:id/billing-settings
router.patch('/:id/billing-settings', updateCustomerBillingSettingsController);

export default router;
