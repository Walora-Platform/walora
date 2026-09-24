/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response } from 'express';
import * as billingService from './billing.service.js';

export async function getInvoicesController(req: Request, res: Response) {
	const invoices = await billingService.getInvoices(req.query);
	res.json(invoices);
}

export async function getInvoiceDetailController(req: Request, res: Response) {
	const { id } = req.params;
	res.json(await billingService.getInvoiceDetails(id));
}

export async function updateBillingItemFinalPriceController(
	req: Request,
	res: Response,
) {
	const { id } = req.params;
	const { finalPrice } = req.body;

	await billingService.updateBillingItemFinalPrice(id, finalPrice);

	res.json({ success: true });
}

export async function updateBillingBatchInvoiceNumberController(
	req: Request,
	res: Response,
) {
	const { id } = req.params;
	const { invoiceNumber } = req.body;

	await billingService.updateBillingBatchInvoiceNumber(id, invoiceNumber);

	res.json({ success: true });
}

export async function changeBillingBatchStatusController(
	req: Request,
	res: Response,
) {
	const { id } = req.params;
	const { status } = req.body;

	await billingService.changeBillingBatchStatus(id, status);

	res.json({ success: true });
}

export async function removeParcelFromBillingItemController(
	req: Request,
	res: Response,
) {
	const { id } = req.params;
	const result = await billingService.removeParcelFromBillingItem(id);

	res.json(result);
}

export async function recalculateBillingBatchController(
	req: Request,
	res: Response,
) {
	const { id } = req.params;
	const result = await billingService.recalculateBillingBatch(id);

	res.json({ deleted: result?.deleted });
}

export async function exportBillingBatchController(
	req: Request,
	res: Response,
) {
	const { id } = req.params;
	const { buffer, filename } =
		await billingService.generateBillingBatchXlsx(id);

	res.setHeader(
		'Content-Type',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	);
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.send(buffer);
}
