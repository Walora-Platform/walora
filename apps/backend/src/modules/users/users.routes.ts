/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireAnyRole } from '../../middlewares/requireRole.js';
import { requirePermission } from '../../middlewares/requirePermission.js';
import {
	addUserController,
	deleteUserController,
	getUsersContoller,
	updateUserPermissionsController,
} from './users.controller.js';

const router = Router();
router.use(requireAuth);

// GET /users
router.get(
	'/',
	requireAnyRole('ADMIN'),
	requirePermission('ADMIN_MANAGE_ACCOUNTS'),
	getUsersContoller,
);

// POST /users
router.post(
	'/',
	requireAnyRole('ADMIN'),
	requirePermission('ADMIN_MANAGE_ACCOUNTS'),
	addUserController,
);

// DELETE /users/:id
router.delete(
	'/:id',
	requireAnyRole('ADMIN'),
	requirePermission('ADMIN_MANAGE_ACCOUNTS'),
	deleteUserController,
);

// PATCH /users/:id/permissions
router.patch(
	'/:id/permissions',
	requireAnyRole('ADMIN'),
	requirePermission('ADMIN_MANAGE_ACCOUNTS'),
	updateUserPermissionsController,
);

export default router;
