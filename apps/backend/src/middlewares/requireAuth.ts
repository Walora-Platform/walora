/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenError } from '../errors/TokenError.js';

// checks if user's session JWT is valid
// then adds .user to the request (req.user = { id, role, permissions, iat, exp })
export function requireAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const token = req.cookies.authToken;
		if (!token) throw new TokenError('Token missing');

		// include user's information from token in the request (see how the token is created in modules/auth/auth.service.ts -> login())
		const user = jwt.verify(token, process.env.JWT_SECRET_KEY);

		if (!user) throw new TokenError();
		else req.user = user;

		// if all good, continue
		next();
	} catch (err) {
		console.error(err);
		if (err instanceof TokenError) {
			return res.status(err.statusCode).json({ error: err.message });
		}

		return res.status(401).json({ error: err?.message });
	}
}
