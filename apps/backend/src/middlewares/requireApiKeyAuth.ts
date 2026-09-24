/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';
import { ApiKeyError } from '../errors/extApi/ApiKeyError.js';

export async function requireApiKeyAuth(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const apiKey = req.headers['x-api-key'];

		if (!apiKey)
			throw new ApiKeyError('API key missing', 401, 'API_KEY_MISSING');

		const key = apiKey.replace('g4api.', '');
		const [prefix, secret] = key.split('.');

		if (!prefix || !secret) throw new ApiKeyError();

		const dbKey = await prisma.customerApiKey.findUnique({
			where: { keyPrefix: prefix },
		});

		if (!dbKey) throw new ApiKeyError();
		if (!dbKey.active)
			throw new ApiKeyError(
				'API key is not activated',
				401,
				'INACTIVE_API_KEY',
			);

		const valid = await bcrypt.compare(secret, dbKey.keyHash);

		if (!valid) throw new ApiKeyError();

		// update lastUsedAt
		await prisma.customerApiKey.update({
			where: { id: dbKey.id },
			data: { lastUsedAt: new Date() },
		});

		// inject customerId to request
		req.customerId = dbKey.customerId;

		next();
	} catch (err) {
		if (err instanceof ApiKeyError) {
			return res
				.status(err.statusCode)
				.json({ message: err.message, code: err.code });
		}

		return res.status(401).json({ message: err?.message });
	}
}
