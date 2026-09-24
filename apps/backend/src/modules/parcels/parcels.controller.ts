/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response } from 'express';
import * as parcelsService from './parcels.service.js';
import fs, { constants } from 'fs/promises';
import { ApiError } from '../../errors/ApiError.js';
import HTTP from '../../utils/constants/httpCodes.js';

export async function getParcelsController(req: Request, res: Response) {
	const data = await parcelsService.getParcels(req.query, req.user);
	res.json(data);
}

export async function changeParcelsStatusController(
	req: Request,
	res: Response,
) {
	const { parcelIds, newStatus } = req.body;
	const data = await parcelsService.changeParcelsStatus(parcelIds, newStatus);

	res.json(data);
}

export async function changeParcelsProblemController(
	req: Request,
	res: Response,
) {
	const { parcelIds, problem } = req.body;
	const data = await parcelsService.changeParcelsProblem(parcelIds, problem);

	res.json(data);
}

export async function getDocumentByIdController(req: Request, res: Response) {
	const { id } = req.params;
	const { user } = req; // to check user's company, if its document for their company's parcel

	const document = await parcelsService.getDocumentById(id, user);
	if (!document)
		return res.status(404).json({
			message: 'Failed to get document',
			details: 'Document not found',
		});

	// file existance
	fs.access(document.path, constants.R_OK, (err) => {
		if (err)
			return res.status(404).json({
				message: 'Failed to get document',
				details: 'File missing on server',
			});
	});

	res.setHeader('Content-Type', 'application/pdf');
	/* Content-Dispositon: inline -> show PDF in browser PDF reader  */
	/* Content-Dispositon: attachment -> download PDF on client  */
	res.setHeader(
		'Content-Disposition',
		`inline; filename="${document.originalName}"`,
	);
	res.sendFile(document.path, (err) => {
		if (err) {
			res.status(404).json({
				message: 'Failed to get document',
				details: 'File not found',
			});
		}
	});
}

export async function editParcelController(req: Request, res: Response) {
	const { id } = req.params;
	const payload = req.body;

	const data = await parcelsService.editParcel(id, payload);

	if (data?.errors)
		res.status(400).json({
			message: 'Nepodařilo se upravit zásilku.',
			details: data?.errors,
		});

	res.json(data);
}

export async function deleteParcelController(req: Request, res: Response) {
	const { parcelId } = req.body;
	const result = await parcelsService.deleteParcel(parcelId);

	res.json({ result });
}

export async function placeParcelsOrdersController(
	req: Request,
	res: Response,
) {
	try {
		const user = req.user;
		const files = req.files as Express.Multer.File[];

		const fileIds = req.body.fileIds;
		const idsArray = Array.isArray(fileIds) ? fileIds : [fileIds];

		if (!files || files.length === 0) {
			throw new ApiError('Nebyli poslány žádné objednávky', 400);
		}

		if (!user.customerCompanyId) {
			throw new ApiError('Pro přijetí objednávky je nutné být zákazníkem');
		}

		const result = await parcelsService.processFiles(
			user.customerCompanyId,
			files,
			idsArray,
		);

		res.status(HTTP.ACCEPTED).json(result);
	} catch (err) {
		console.error(err);
		if (err instanceof ApiError) {
			return res.status(err.statusCode).json({ message: err.message });
		}
	}
}

export async function setInvoicedExternallyController(
	req: Request,
	res: Response,
) {
	const { parcelIds, setTo } = req.body;

	const updated = await parcelsService.setInvoicedExternally(parcelIds, setTo);

	res.json(updated);
}
