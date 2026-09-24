/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Router } from 'express';
import swagger from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';

const router = Router();

const specs = swagger({
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Global4PL API',
			version: '1.0.0',
			description: 'API pro integraci se zákazníky',
		},
		servers: [
			{
				url: 'https://api.global4pl.cz',
			},
		],

		components: {
			securitySchemes: {
				ApiKeyAuth: {
					type: 'apiKey',
					in: 'header',
					name: 'x-api-key',
				},
			},
			schemas: {
				PickupLocation: {
					type: 'object',
					required: ['date', 'name', 'streetAddress', 'city', 'psc', 'state'],
					properties: {
						date: { type: 'string', format: 'date', example: '2026-04-08' },
						timeFrom: { type: 'string', format: 'time', example: '08:00' },
						timeTo: { type: 'string', format: 'time', example: '17:00' },
						name: { type: 'string', example: 'Firma s.r.o.' },
						streetAddress: { type: 'string', example: 'Ulice 123' },
						city: { type: 'string', example: 'Praha' },
						psc: {
							type: 'string',
							example: '11000',
							pattern: '^\\d{3}\\s?\\d{2}$',
						},
						state: {
							type: 'string',
							example: 'CZ',
							minLength: 2,
							maxLength: 2,
							pattern: '^[A-Z]{2}$',
						},
						contactName: { type: 'string', example: 'Jan Novák' },
						contactPhone: { type: 'string', example: '+420123456789' },
					},
				},
				DeliveryLocation: {
					type: 'object',
					required: ['date', 'name', 'streetAddress', 'city', 'psc', 'state'],
					properties: {
						date: { type: 'string', format: 'date', example: '2026-04-08' },
						timeFrom: { type: 'string', format: 'time', example: '08:00' },
						timeTo: { type: 'string', format: 'time', example: '17:00' },
						name: { type: 'string', example: 'Firma s.r.o.' },
						streetAddress: { type: 'string', example: 'Ulice 123' },
						city: { type: 'string', example: 'Praha' },
						psc: {
							type: 'string',
							example: '11000',
							pattern: '^\\d{3}\\s?\\d{2}$',
						},
						state: {
							type: 'string',
							example: 'CZ',
							minLength: 2,
							maxLength: 2,
							pattern: '^[A-Z]{2}$',
						},
						contactName: { type: 'string', example: 'Jan Novák' },
						contactPhone: { type: 'string', example: '+420123456789' },
						note: { type: 'string', example: 'Poznámka k doručení' },
					},
				},
				Parcel: {
					type: 'object',
					required: [
						'billOfLading',
						'palletsCount',
						'palletSpacesCount',
						'weight',
						'volume',
						'temperatureMode',
						'pickup',
						'delivery',
					],
					properties: {
						billOfLading: { type: 'string', example: 'BOL-12345' },
						reference: { type: 'string', example: 'REF-001' },
						palletsCount: { type: 'integer', example: 3, minimum: 0 },
						palletSpacesCount: {
							type: 'number',
							example: 2.5,
							minimum: 0,
							multipleOf: 0.5,
						},
						weight: { type: 'number', example: 123.5, minimum: 0 },
						volume: { type: 'number', example: 1.2, minimum: 0 },
						temperatureMode: { type: 'string', example: '01' },
						pickup: { $ref: '#/components/schemas/PickupLocation' },
						delivery: { $ref: '#/components/schemas/DeliveryLocation' },
					},
				},
				Parcels: {
					type: 'array',
					minItems: 1,
					maxItems: 100,
					items: { $ref: '#/components/schemas/Parcel' },
				},
			},
		},
		security: [{ ApiKeyAuth: [] }],

		tags: [
			{
				name: 'Parcels',
				description: 'Zásilky',
			},
		],
	},
	apis: ['./src/modules/extApi/**/*.ts'],
});

router.use(
	'/',
	swaggerUI.serve,
	swaggerUI.setup(specs, {
		customSiteTitle: 'Global4PL API docs',
		swaggerOptions: {
			supportedSubmitMethods: [], // no 'Try it out' buttons on site (no playground)
		},
	}),
);

router.get('/openapi.json', (req, res) => {
	res.type('application/json').send(specs);
});

export default router;
