/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { ApiError } from './ApiError.js';

export class TokenError extends ApiError {
	constructor(message = 'Invalid token') {
		super(message, 401);
	}
}
