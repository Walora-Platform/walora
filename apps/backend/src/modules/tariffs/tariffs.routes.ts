/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { uploadTariff } from '../../middlewares/multer.js';
import {
	addTariffController,
	downloadTariffController,
	getTariffsController,
	archivateTariffController,
	unarchivateTariffController,
	deleteTariffController,
} from './tariffs.controller.js';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { requireAnyRole } from '../../middlewares/requireRole.js';

const router = Router();

// requireAuth will check if the user's session token is valid and also add .user to request -> req.user = {userId, role, iat, exp}
router
	.use(requireAuth)
	.use(requireAnyRole('PROVIDER_USER', 'PROVIDER_ADMIN'))
	.use(requirePermission('TARIFFS_CARRIERS', 'TARIFFS_CUSTOMERS'));

// uploadTariff.single('file') is multer middleware that saves the file and its data are then available at req.file = { originalname, mimetype, path, filename, size , ... }
router.post('/', uploadTariff.single('file'), addTariffController);
router.get('/:purpose', getTariffsController);
router.get('/:id/download', downloadTariffController);
router.post('/:id/archivate', archivateTariffController);
router.post('/:id/unarchivate', unarchivateTariffController);
router.post('/:id/delete', deleteTariffController);

export default router;
