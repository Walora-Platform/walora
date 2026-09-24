/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { ApiError } from './ApiError.js';
import HTTP from '../utils/constants/httpCodes.js';

export class UserError extends ApiError {
	constructor(message, statusCode = HTTP.FORBIDDEN) {
		super(message, statusCode);
	}
}
