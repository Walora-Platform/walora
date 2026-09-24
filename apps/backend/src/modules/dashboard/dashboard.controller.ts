/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response } from 'express';
import * as dashboardService from './dashboard.service.js';

export async function getDashboardDataController(req: Request, res: Response) {
	try {
		const data = await dashboardService.getDashboardData(req.user);
		res.json(data);
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: 'Nepodařilo se načíst data pro KPI kartičky',
			details: err.message,
		});
	}
}
