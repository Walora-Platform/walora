/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { $ZodIssue } from 'zod/v4/core';
import { ApiError } from '../ApiError.js';

export class ApiResultError extends ApiError {
	issues: $ZodIssue[];

	constructor(
		statusCode: number,
		issues: $ZodIssue[],
		message: string = 'Bad request, see issues',
	) {
		super(message, statusCode);
		this.issues = issues;
	}
}
