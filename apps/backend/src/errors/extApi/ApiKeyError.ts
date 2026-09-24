/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { ApiError } from '../ApiError.js';

export class ApiKeyError extends ApiError {
	code: string;

	constructor(
		message: string = 'Invalid API key',
		statusCode: number = 401,
		code: string = 'INVALID_API_KEY',
	) {
		super(message, statusCode);
		this.code = code;
	}
}
