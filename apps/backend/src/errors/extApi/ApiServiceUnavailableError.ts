/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { ApiError } from '../ApiError.js';

export class ApiServiceUnavailableError extends ApiError {
	constructor(
		statusCode: number = 503,
		message: string = 'Service unavailable',
	) {
		super(message, statusCode);
	}
}
