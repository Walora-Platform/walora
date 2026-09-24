/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response } from 'express';
import * as carriersService from './carriers.service.js';

// controller for multiple paths
export async function getCarriersController(req: Request, res: Response) {
	const path = req.route.path;
	if (path === '/reduced') {
		const carriers = await carriersService.getCarriersReduced();
		return res.json(carriers);
	}

	const carriers = await carriersService.getCarriers(req.query);
	res.json(carriers);
}

export async function getCarrierProfileController(req: Request, res: Response) {
	const { id } = req.params;

	const profile = await carriersService.getCarrierProfile(id);

	res.json(profile);
}

export async function addCarrierController(req: Request, res: Response) {
	const input = req.body;

	await carriersService.addCarrier(input);

	res.json({ success: true });
}

export async function patchCarrierController(req: Request, res: Response) {
	const { id } = req.params;
	const input = req.body;

	await carriersService.patchCarrier(id, input);

	res.json({ success: true });
}

export async function deleteCarrierController(req: Request, res: Response) {
	const { id } = req.params;

	await carriersService.deleteCarrier(id);

	res.json({ success: true });
}
