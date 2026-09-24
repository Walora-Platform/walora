/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '../config/generated/prisma-client/enums.js';

// REQUIRED TO BE USED AFTER requireAuth middleware (because of the user object)
export function requireRole(role: Role) {
	return (req: Request, res: Response, next: NextFunction) => {
		if (req.user.role !== role) {
			return res.status(403).json({ error: 'Forbidden' });
		}
		next();
	};
}

// REQUIRED TO BE USED AFTER requireAuth middleware (because of the user object)
// if any of the specified roles match -> success
export function requireAnyRole(...roles: Role[]) {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!roles.includes(req.user.role)) {
			return res.status(403).json({ error: 'Forbidden' });
		}
		next();
	};
}
