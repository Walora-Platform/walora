/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Router } from 'express';
import {
	loginController,
	checkAuthController,
	logoutController,
} from './auth.controller.js';

const router = Router();

router.post('/login', loginController);
router.get('/check', checkAuthController);
router.post('/logout', logoutController);

export default router;
