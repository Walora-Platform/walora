/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import prisma from '../../config/prisma';
import { getTodayDateUTCMidnight } from '../../utils/dates';
import {
	createPeriodicBillingBatch,
	CustomerBillingInfo,
	shouldRunBillingToday,
} from './billing.service';
import fs from 'fs/promises';

/* ChatGPT AI generated test() and expect() for simple testing */
function test(name: string, fn: () => void) {
	try {
		fn();
		console.log(`✅ ${name}`);
	} catch (e) {
		console.error(`❌ ${name}`);
		console.error(e.message);
	}
}

function expect(received: boolean) {
	return {
		toBe(expected: boolean) {
			if (received !== expected) {
				throw new Error(`Expected ${expected}, got ${received}`);
			}
		},
	};
}

// "2026-04-11" -> UTC midnight
function d(date: string) {
	return new Date(`${date}T00:00:00.000Z`);
}

/* ---------------------- TEST CASES ---------------------- */

console.log('TESTS FOR: shouldRunBillingToday()');
/* billingMode: MONTHLY_DAY (10) */
const customer = {
	id: '1',
	billingMode: 'MONTHLY_DAY',
	billingDayOfMonth: 10,
};

test('runs on 10th', () => {
	expect(shouldRunBillingToday(customer, d('2026-04-10'))).toBe(true);
});

test('runs on 20th', () => {
	expect(shouldRunBillingToday(customer, d('2026-04-20'))).toBe(true);
});

test('runs on end of month (2026-04-30)', () => {
	expect(shouldRunBillingToday(customer, d('2026-04-30'))).toBe(true);
});

test('runs on end of month (2026-05-31)', () => {
	expect(shouldRunBillingToday(customer, d('2026-05-31'))).toBe(true);
});

test('runs on 28.2. (February end 2026-02-28)', () => {
	expect(shouldRunBillingToday(customer, d('2026-02-28'))).toBe(true);
});

test('runs on 29.2. (February end 2024-02-29)', () => {
	expect(shouldRunBillingToday(customer, d('2024-02-29'))).toBe(true);
});

test('does NOT run on 11th', () => {
	expect(shouldRunBillingToday(customer, d('2026-04-11'))).toBe(false);
});

test('does NOT run on random day', () => {
	expect(shouldRunBillingToday(customer, d('2026-04-16'))).toBe(false);
});

/* billingMode: MONTHLY_DAY (billingDayOfMonth = null) */
test('null step should not crash', () => {
	const c = {
		id: '1',
		billingMode: 'MONTHLY_DAY',
		billingDayOfMonth: null,
	};

	expect(shouldRunBillingToday(c, d('2026-04-11'))).toBe(false);
});

/* billingMode: MONTHLY_DAY (1) */
const customerDay1 = {
	id: '1',
	billingMode: 'MONTHLY_DAY',
	billingDayOfMonth: 1,
};

test('step=1 runs every day', () => {
	expect(shouldRunBillingToday(customerDay1, d('2026-04-01'))).toBe(true);
	expect(shouldRunBillingToday(customerDay1, d('2026-04-02'))).toBe(true);
	expect(shouldRunBillingToday(customerDay1, d('2026-04-03'))).toBe(true);
	expect(shouldRunBillingToday(customerDay1, d('2026-04-08'))).toBe(true);
	expect(shouldRunBillingToday(customerDay1, d('2026-04-15'))).toBe(true);
	expect(shouldRunBillingToday(customerDay1, d('2026-04-30'))).toBe(true);
});

/* billingMode: MONTHLY_DAY (15) */
const customerDay15 = {
	id: '1',
	billingMode: 'MONTHLY_DAY',
	billingDayOfMonth: 15,
};

test('step=15 runs 2 times a month', () => {
	expect(shouldRunBillingToday(customerDay15, d('2026-04-15'))).toBe(true); // 1. - 15.
	expect(shouldRunBillingToday(customerDay15, d('2026-04-30'))).toBe(true); // month end
});

test('step=15 doesnt run on 1, 14, 16, 29', () => {
	expect(shouldRunBillingToday(customerDay15, d('2026-04-01'))).toBe(false);
	expect(shouldRunBillingToday(customerDay15, d('2026-04-14'))).toBe(false);
	expect(shouldRunBillingToday(customerDay15, d('2026-04-16'))).toBe(false);
	expect(shouldRunBillingToday(customerDay15, d('2026-04-29'))).toBe(false);
});

/* billingMode: MONTHLY_DAY (7) */
const customerDay7 = {
	id: '1',
	billingMode: 'MONTHLY_DAY',
	billingDayOfMonth: 7,
};

test('step=7 works across month', () => {
	expect(shouldRunBillingToday(customerDay7, d('2026-04-07'))).toBe(true);
	expect(shouldRunBillingToday(customerDay7, d('2026-04-14'))).toBe(true);
	expect(shouldRunBillingToday(customerDay7, d('2026-04-21'))).toBe(true);
	expect(shouldRunBillingToday(customerDay7, d('2026-04-28'))).toBe(true);
	expect(shouldRunBillingToday(customerDay7, d('2026-04-30'))).toBe(true);
});

/* billingMode: MONTH_END */
const customerEnd = {
	id: '2',
	billingMode: 'MONTH_END',
	billingDayOfMonth: null,
};

test('MONTH_END runs on 1st', () => {
	expect(shouldRunBillingToday(customerEnd, d('2026-04-01'))).toBe(true);
});

test('MONTH_END does NOT run on other days', () => {
	expect(shouldRunBillingToday(customerEnd, d('2026-04-02'))).toBe(false);
	expect(shouldRunBillingToday(customerEnd, d('2026-04-10'))).toBe(false);
	expect(shouldRunBillingToday(customerEnd, d('2026-04-15'))).toBe(false);
	expect(shouldRunBillingToday(customerEnd, d('2026-04-16'))).toBe(false);
	expect(shouldRunBillingToday(customerEnd, d('2026-04-29'))).toBe(false);
	expect(shouldRunBillingToday(customerEnd, d('2026-04-30'))).toBe(false);
});

/* WHOLE MONTH TEST */
function printMonthAtStep(step: number) {
	const c = {
		id: '1',
		billingMode: 'MONTHLY_DAY',
		billingDayOfMonth: step,
	};

	const results: Record<string, boolean> = {};

	for (let i = 1; i <= 31; i++) {
		const date = `2026-01-${String(i).padStart(2, '0')}`;
		results[date] = shouldRunBillingToday(c, d(date));
	}

	console.log(results);
}

test('step=1 whole month (see object above)', () => printMonthAtStep(1));
test('step=2 whole month (see object above)', () => printMonthAtStep(2));
test('step=3 whole month (see object above)', () => printMonthAtStep(3));
test('step=10 whole month (see object above)', () => printMonthAtStep(10));

/* billingMode: NONE */
const customerNone = {
	id: '3',
	billingMode: 'NONE',
	billingDayOfMonth: null,
};

test('NONE never runs', () => {
	expect(shouldRunBillingToday(customerNone, d('2026-04-11'))).toBe(false);
});

async function testBilling() {
	console.log('\nTEST DEMO BILLING');

	const customer: CustomerBillingInfo = await prisma.customerCompany.findUnique(
		{
			where: { code: 'ASF' },
			select: {
				id: true,
				code: true,
				billingMode: true,
				billingDayOfMonth: true,
			},
		},
	);

	if (!customer) {
		console.log('Customer not found');
		return;
	}

	console.log('\nCustomer:', customer.code);
	console.log('BillingMode:', customer.billingMode);
	console.log('BullingDayOfMonth:', customer.billingDayOfMonth);

	if (customer.billingMode === 'NONE') {
		console.log('BullingMode "NONE" -> billing isnt enabled!');
		return;
	}

	console.log('Running billing for customer:', customer.code);

	await createPeriodicBillingBatch(customer, getTodayDateUTCMidnight());

	const lastBatch = await prisma.billingBatch.findFirst({
		where: { customerCompanyId: customer.id },
		include: {
			billingItems: {
				include: {
					parcels: {
						select: { id: true, deliveryPsc: true, palletsCount: true },
					},
				},
			},
		},
		orderBy: { createdAt: 'desc' },
	});

	if (!lastBatch) {
		console.log('No batch found');
		return;
	}

	const output = {
		batch: {
			id: lastBatch.id,
			periodFrom: lastBatch.periodFrom,
			periodTo: lastBatch.periodTo,
			hasErrors: lastBatch.hasErrors,
			errorCode: lastBatch.errorCode,
			itemsCount: lastBatch.billingItems.length,
			tariffId: lastBatch.tariffId,
		},
		items: lastBatch.billingItems.map((item) => ({
			id: item.id,
			deliveryPsc: item.deliveryPsc,
			zoneLabel: item.zoneLabel,
			pricePerPallet: item.pricePerPallet,
			totalPallets: item.totalPallets,
			tariffPrice: item.tariffPrice,
			finalPrice: item.finalPrice,
			errorCode: item.errorCode,
			parcels: item.parcels.map((p) => ({
				id: p.id,
				psc: p.deliveryPsc,
				pallets: p.palletsCount,
			})),
		})),
	};

	await fs.mkdir('./src/tests', { recursive: true });
	await fs.writeFile(
		`./src/tests/billing-test-${Date.now()}.json`,
		JSON.stringify(output, null, 2),
	);

	console.log('Output saved in ./tests');
}

// uncomment the next line to invoke testBilling()
testBilling().catch(console.error);
