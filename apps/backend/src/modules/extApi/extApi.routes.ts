/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Router } from 'express';
import { requireApiKeyAuth } from '../../middlewares/requireApiKeyAuth.js';
import {
	addParcelsBulkController,
	addParcelsBulkControllerDemo,
} from './extApi.controller.js';

const router = Router();
router.use(requireApiKeyAuth); // for all routes here require api key auth

/**
 * @openapi
 * /v1/demo/parcels:
 *   post:
 *     summary: Ověření požadavku pro vytvoření zásilek (URČENO PRO TESTOVÁNÍ)
 *     description: |
 *       Endpoint slouží k ověření funkčnosti integrace s validací požadavku.
 *       Data sa ověřují podle Parcels schémy. Žádné zásilky nebudou uloženy do databázy.
 *
 *     tags:
 *       - Parcels
 *
 *     security:
 *       - ApiKeyAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Parcels'
 *
 *     responses:
 *       202:
 *         description: Požadavek je ve správnem formátu a takéto zásilky by byli přijaty
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 3
 *
 *       400:
 *         description: Chyba validace
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bad request, see issues
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: array
 *                         items:
 *                           type: string
 *                       message:
 *                         type: string
 *
 *       401:
 *         description: Neplatný nebo chybějící klíč API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "API key missing"
 *                 code:
 *                   type: string
 *                   example: "API_KEY_MISSING"
 *
 *       503:
 *         description: Služba nedostupná
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service unavailable"
 *
 */
router.post('/demo/parcels', addParcelsBulkControllerDemo);

/**
 * @openapi
 * /v1/parcels:
 *   post:
 *     summary: Vytvoření zásilek
 *     description: |
 *       Endpoint slouží k odeslání zásilek do systému.
 *       Data sa ověřují podle Parcels schémy. Pokud jsou data v pořádku, zásilky budou přijaty a uloženy do databáze.
 *     tags:
 *       - Parcels
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Parcel'
 *             minItems: 1
 *             maxItems: 100
 *     responses:
 *       202:
 *         description: Zásilky byli přijaté
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 3
 *
 *       400:
 *         description: Chyba validace
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bad request, see issues
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: array
 *                         items:
 *                           type: string
 *                       message:
 *                         type: string
 *
 *       401:
 *         description: Neplatný nebo chybějící klíč API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "API key missing"
 *                 code:
 *                   type: string
 *                   example: "API_KEY_MISSING"
 *
 *       503:
 *         description: Služba nedostupná
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service unavailable"
 *
 */
router.post('/parcels', addParcelsBulkController);

export default router;
