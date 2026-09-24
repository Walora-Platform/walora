/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import {
	addCarrierController,
	deleteCarrierController,
	getCarrierProfileController,
	getCarriersController,
	patchCarrierController,
} from './carriers.controller.js';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { requireAnyRole } from '../../middlewares/requireRole.js';

const router = Router()
	.use(requireAuth)
	.use(requireAnyRole('PROVIDER_ADMIN', 'PROVIDER_USER'))
	.use(requirePermission('CARRIERS'));

router.get('/', getCarriersController);
router.get('/reduced', getCarriersController); // reduced data for tariffs view

router.post('/', addCarrierController);

router.get('/:id', getCarrierProfileController);
router.patch('/:id', patchCarrierController);
router.delete('/:id', deleteCarrierController);

export default router;
