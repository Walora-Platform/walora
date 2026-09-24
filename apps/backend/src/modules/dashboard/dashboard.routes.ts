/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { getDashboardDataController } from './dashboard.controller.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('CUSTOMER_DASHBOARD', 'DASHBOARD'));

// GET /dashboard/data
router.get('/data', getDashboardDataController);

export default router;
