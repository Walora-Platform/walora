/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response } from 'express';
import * as customersService from './customers.service.js';
import { RequestError } from '../../errors/RequestError.js';

export async function getCustomersController(req: Request, res: Response) {
	try {
		const path = req.route.path;
		if (path === '/reduced') {
			return res.json(await customersService.getCustomersReduced());
		}
		const customers = await customersService.getCustomers(req.query);
		res.json(customers);
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: 'Nepodařilo se načíst zákazníky',
		});
	}
}

export async function getCustomerProfileController(
	req: Request,
	res: Response,
) {
	const { id } = req.params;
	const customer = await customersService.getCustomerProfile(id);

	res.json(customer);
}

export async function addCustomerController(req: Request, res: Response) {
	try {
		const { name, code } = req.body;

		await customersService.addCustomer(name, code);

		res.json({ success: true });
	} catch (err) {
		console.error(err);
		if (err instanceof RequestError) {
			return res.status(err.statusCode).json({
				message: 'Nepodařilo se vytvořit zákazníka',
				details: err.message,
			});
		}

		res.status(500).json({
			message: 'Nepodařilo se vytvořit zákazníka',
		});
	}
}

export async function patchCustomerController(req: Request, res: Response) {
	const { id } = req.params;
	const { name, code } = req.body;

	await customersService.patchCustomer(id, name, code);

	res.json({ success: true });
}

export async function deleteCustomerController(req: Request, res: Response) {
	const { id } = req.params;

	await customersService.deleteCustomer(id);

	res.json({ success: true });
}

export async function generateApiKeyController(req: Request, res: Response) {
	try {
		const { id } = req.params;

		const key = await customersService.generateApiKeyFor(id);

		res.json({ key });
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: 'Nepodařilo se vygenerovat API klíč',
		});
	}
}

export async function manageApiKeyController(req: Request, res: Response) {
	try {
		const { keyId } = req.params;
		const { action, isActive } = req.body;

		if (action === 'delete') {
			await customersService.deleteApiKey(keyId);
		} else if (action === 'setActive') {
			await customersService.setActiveForApiKeyTo(keyId, isActive);
		}

		res.json({ success: action });
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: 'Nepodařilo se upravit API klíč',
		});
	}
}

export async function updateCustomerBillingSettingsController(
	req: Request,
	res: Response,
) {
	const { id } = req.params;
	const { billingMode, billingDayOfMonth } = req.body;

	await customersService.updateCustomerBillingSettings(
		id,
		billingMode,
		billingDayOfMonth,
	);

	res.json(200);
}
