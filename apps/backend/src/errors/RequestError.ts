/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import ERROR_CODE from '../utils/constants/errorCodes.js';
import HTTP from '../utils/constants/httpCodes.js';
import { ApiError } from './ApiError.js';

export class RequestError extends ApiError {
	errors?: string[];
	errorCode?: typeof ERROR_CODE;

	constructor(
		message: string,
		statusCode: number = HTTP.BAD_REQUEST,
		errors?: string[],
		errorCode?: string,
	) {
		super(message, statusCode);
		this.errors = errors;
		this.errorCode = errorCode;
	}
}
