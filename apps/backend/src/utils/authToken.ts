/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request } from 'express';
import { TokenError } from '../errors/TokenError.js';

export function getAuthTokenCookie(req: Request) {
	const token = req.cookies.authToken;
	if (!token) throw new TokenError('Token missing');
	return token;
}
