/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response } from 'express';
import * as extApiService from './extApi.service.js';
import { ParcelsSchema } from './extApi.validation.js';
import { ApiResultError } from '../../errors/extApi/ApiResultError.js';
import http from '../../utils/constants/httpCodes.js';
import { ApiServiceUnavailableError } from '../../errors/extApi/ApiServiceUnavailableError.js';

export async function addParcelsBulkController(req: Request, res: Response) {
	try {
		const result = ParcelsSchema.safeParse(req.body);

		if (!result.success) {
			throw new ApiResultError(http.BAD_REQUEST, result.error.issues);
		}

		const parcels = result.data;

		await extApiService.addParcelsBulk(req.customerId, parcels);

		res.status(http.ACCEPTED).json({
			count: parcels.length,
		});
	} catch (err) {
		console.error(err);
		if (err instanceof ApiServiceUnavailableError) {
			return res.status(err.statusCode).json({
				message: err.message,
			});
		}

		if (err instanceof ApiResultError) {
			return res.status(err.statusCode).json({
				message: err.message,
				issues: err.issues,
			});
		}

		res.status(500).json({
			message: 'Server error',
		});
	}
}

export async function addParcelsBulkControllerDemo(
	req: Request,
	res: Response,
) {
	try {
		const result = ParcelsSchema.safeParse(req.body);

		if (!result.success) {
			throw new ApiResultError(http.BAD_REQUEST, result.error.issues);
		}

		const parcels = result.data;

		res.status(http.ACCEPTED).json({
			count: parcels.length,
		});
	} catch (err) {
		console.error(err);
		if (err instanceof ApiServiceUnavailableError) {
			return res.status(err.statusCode).json({
				message: err.message,
			});
		}

		if (err instanceof ApiResultError) {
			return res.status(err.statusCode).json({
				message: err.message,
				issues: err.issues,
			});
		}

		res.status(500).json({
			message: 'Server error',
		});
	}
}
