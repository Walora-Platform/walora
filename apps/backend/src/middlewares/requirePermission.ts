/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response, NextFunction } from 'express';
import { PermissionKey } from '../modules/users/permissions.config.js';

// REQUIRED TO BE USED AFTER requireAuth middleware (because of the user object)
// params: permission key strings
// if atleast one of the params matches, it will proceed
export function requirePermission(...requiredPermissions: PermissionKey[]) {
	return (req: Request, res: Response, next: NextFunction) => {
		const user = req.user;

		const has = requiredPermissions.some((p) => user.permissions.includes(p));

		if (!has) {
			return res
				.status(403)
				.json({ error: 'User does not have needed permission' });
		}

		// all good, continue
		next();
	};
}
