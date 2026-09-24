/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { z } from 'zod';

/* BASE FORMATS */
const int = z.int().gte(0);
const decimal = z.number().gte(0);

// is integer: 2.5 x 2 = 5 true| 2.2 x 2 = 4.4 false | 3 x 2 = 6 true
const palletSpacesDecimal = decimal.refine((val) => Number.isInteger(val * 2), {
	error: 'Must be whole number or .5',
});

const stringTrim = z.string().trim().min(1);
const string100 = stringTrim.max(100);
const string255 = stringTrim.max(255);

export const psc = z
	.string()
	.trim()
	.regex(
		/^\d{3}\s?\d{2}$/,
		"PSC must be 'DDDDD' or 'DDD DD' (PSČ musí být 'DDDDD' nebo 'DDD DD')",
	)
	.transform((val) => val.replace(/\s/g, ''));

const date = z.iso.date().transform((val) => new Date(val)); // "YYYY-MM-DD"
const time = z.iso.time({
	precision: -1,
	error: 'Time must be ISO format hh:mm (Čas musí být ve formátu hh:mm)',
}); // "hh:mm"

/* COUNTRY CODE 2-ALPHA */
const countryCode2AlphaError = {
	error:
		'Označení státu musí být 2 velké písmena ISO 3166-1 alpha-2 formát (Country must be ISO 3166-1 alpha-2)',
};
const countryCode2Alpha = z
	.string()
	.length(2, countryCode2AlphaError)
	.regex(/^[A-Z]{2}$/, countryCode2AlphaError);

/* CASH ON DELIVERY */
// https://en.wikipedia.org/wiki/ISO_4217
const supportedCurrencies = [
	'CZK',
	'EUR',
	'USD',
	'GBP', // England
	'PLN', // Poland
	'HUF', // Hungary
	'CHF', // Switzerland, Liechtenstein
	'CHE', // Switzerland
	'CHW', // Switzerland
	'SEK', // Sweden
	'NOK', // Norway
	'DKK', // Denmark
	'RON', // Romania
] as const;

const codCurrencyError = {
	error: `je neplatná možnost. Podporované jsou: ${supportedCurrencies.join(', ')}`,
};
const codAmountError = {
	error: 'Suma dobírky nesmí být nula (Cash On Delivery has to be above zero)',
};

const currencyCode = stringTrim
	.toUpperCase()
	.pipe(z.enum(supportedCurrencies, codCurrencyError));

const cashOnDeliveryAmount = decimal.gt(0, codAmountError);

export const CashOnDeliverySchema = z.object({
	amount: cashOnDeliveryAmount,
	currency: currencyCode,
});

/* LOCATION DETAILS SCHEMA */
export const LocationSchema = z.object({
	date: date,
	timeFrom: time.optional(),
	timeTo: time.optional(),

	name: string100,
	streetAddress: string100,
	city: string100,
	psc: psc,
	state: countryCode2Alpha,

	contactName: string100.optional(),
	contactPhone: string100.optional(),
});

export const ParcelSchema = z.object({
	billOfLading: string100,
	reference: string100.optional(),

	palletsCount: int,
	palletSpacesCount: palletSpacesDecimal,
	weight: decimal,
	volume: decimal,
	temperatureMode: string100.optional(),

	// cashOnDelivery as a whole is optional
	// but if one of the amount or currency is present, they are expected to be both present
	cashOnDelivery: CashOnDeliverySchema.optional(),

	pickup: LocationSchema,
	delivery: LocationSchema.extend({
		note: string255.optional(),
	}),
});

export const ParcelsSchema = z.array(ParcelSchema).min(1).max(100);
