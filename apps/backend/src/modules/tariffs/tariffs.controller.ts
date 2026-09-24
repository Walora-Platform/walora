/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response } from 'express';
import path from 'path';
import * as tariffsService from './tariffs.service.js';
import { ApiError } from '../../errors/ApiError.js';
import HTTP from '../../utils/constants/httpCodes.js';
import MIME from '../../utils/constants/mimeTypes.js';
import { RequestError } from '../../errors/RequestError.js';
import { validateSubjects } from './tariffs.validation.js';

export async function addTariffController(req: Request, res: Response) {
	try {
		// get everything from the request
		const {
			name,
			purpose,
			structure,
			calculation,
			carrierIds,
			customerCompanyIds,
			validFrom,
			validTo,
		} = req.body;

		const file = req.file;
		const userId = req.user.id;

		if (!file) throw new RequestError('Chybí soubor s daty tarifu');

		// based on purpose, there need to be either customers or carriers defined
		validateSubjects(purpose, customerCompanyIds, carrierIds);

		// unique tariff name constraint
		await tariffsService.checkNameConstraint(name);

		// dates
		const from = new Date(validFrom);

		let to: Date | null = null;
		if (validTo && validTo !== 'undefined') {
			to = new Date(validTo);
		}

		// check validFrom > validTo?
		if (to && from > to) {
			throw new RequestError('Nesprávna doba platnosti');
		}

		// check file mimetype
		if (file.mimetype !== MIME.XLSX) {
			throw new RequestError('Očekávan .xlsx soubor');
		}

		// validity period cant overlap, 1 active tariff at a time per subject constraint check
		await tariffsService.checkTariffValidityPeriodOverlap({
			carrierIds,
			customerIds: customerCompanyIds,
			newValidFrom: from,
			newValidTo: to,
		});

		const tariff = await tariffsService.createTariff({
			name,
			purpose,
			structure,
			calculation,
			validFrom: from,
			validTo: to,
			carrierIds,
			customerCompanyIds,
			file,
			userId,
		});

		console.log('New tariff in DB:', tariff);

		res.json({ success: true });
	} catch (err) {
		console.error(`${req.method} ${req.baseUrl}${req.path} error\n`, err);

		if (err instanceof RequestError) {
			return res.status(err.statusCode).json({
				message: err.message,
				errors: err?.errors,
				errorCode: err?.errorCode,
			});
		}

		if (err instanceof ApiError) {
			return res.status(err.statusCode).json({ message: err.message });
		}

		res.status(500).json({ message: 'Nepodařilo se vytvořit tarif' });
	}
}

export async function getTariffsController(req: Request, res: Response) {
	try {
		const { purpose } = req.params;
		const tariffs = await tariffsService.getAll(purpose);
		return res.json(tariffs);
	} catch (err) {
		console.error(`${req.method} ${req.baseUrl}${req.path} error\n`, err);
		res.status(500).json({ message: 'Nepodařilo se získat tarify' });
	}
}

export async function downloadTariffController(req: Request, res: Response) {
	try {
		const { id } = req.params;
		if (!id)
			return res.status(400).json({ message: 'Nespecifikováno id tarifu' });

		const { path, name } = await tariffsService.downloadTariffXlsxById(id);

		res.download(path, name);
	} catch (err) {
		console.error(`${req.method} ${req.baseUrl}${req.path} error\n`, err);
		res.status(500).json({ message: 'Nepodařilo se stáhnout tarif' });
	}
}

export async function archivateTariffController(req: Request, res: Response) {
	try {
		const { id } = req.params;
		if (!id)
			return res.status(400).json({ message: 'Nespecifikováno id tarifu' });

		await tariffsService.archivateTariffById(id);

		res.json({ success: true });
	} catch (err) {
		console.error(`${req.method} ${req.baseUrl}${req.path} error\n`, err);
		res.status(500).json({ message: 'Nepodařilo se archivovat tarif' });
	}
}

export async function unarchivateTariffController(req: Request, res: Response) {
	try {
		const { id } = req.params;
		if (!id)
			return res.status(400).json({ message: 'Nespecifikováno id tarifu' });

		await tariffsService.unarchivateTariffById(id);

		res.json({ success: true });
	} catch (err) {
		if (err instanceof RequestError && err.errors?.length) {
			let message = err.message;

			if (err.errorCode === 'VALID_PERIOD_OVERLAP') {
				message = 'Archivaci nelze zrušit kvůli průniku dob platností tarifů.';
			}

			return res
				.status(err.statusCode)
				.json({ message, details: err.errors.join('\n') });
		}

		// handle the error in global handler
		throw err;
	}
}

export async function deleteTariffController(req: Request, res: Response) {
	const { id } = req.params;

	await tariffsService.deleteTariffById(id);

	res.json({ success: true });
}
