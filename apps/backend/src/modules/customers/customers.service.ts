/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Prisma } from '../../config/generated/prisma-client/client.js';
import prisma from '../../config/prisma.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { RequestError } from '../../errors/RequestError.js';
import { BillingMode } from '../../config/generated/prisma-client/enums.js';
import { formatDate, formatDbDate, formatTime } from '../../utils/datetimes.js';

export async function getCustomers(query) {
	const page = Number(query.page ?? 0);
	const pageSize = Number(query.pageSize ?? 20);

	const [data, total] = await prisma.$transaction([
		prisma.customerCompany.findMany({
			select: {
				id: true,
				code: true,
				name: true,
				createdAt: true,
				_count: {
					select: {
						users: true,
						customerApiKeys: { where: { active: true } },
					},
				},
				tariffs: {
					where: {
						tariff: { status: 'ACTIVE' },
					},
					select: {
						tariff: { select: { name: true, validTo: true } },
					},
				},
			},
			take: pageSize,
			skip: page * pageSize,
			orderBy: { code: 'asc' },
		}),
		prisma.customerCompany.count(),
	]);

	return { data: data.map(customerMap), total };
}

const customerMap = (customer) => {
	const activeTariff = customer.tariffs[0]?.tariff ?? null;
	if (activeTariff) activeTariff.validTo = formatDbDate(activeTariff.validTo);

	return {
		id: customer.id,
		code: customer.code,
		name: customer.name,
		createdAt: {
			date: formatDate(customer.createdAt),
			time: formatTime(customer.createdAt),
		},
		count: {
			users: customer._count.users,
			activeApiKeys: customer._count.customerApiKeys,
		},
		activeTariff,
	};
};

export async function getCustomersReduced() {
	return await prisma.customerCompany.findMany({
		select: {
			id: true,
			code: true,
		},
	});
}

export async function getCustomerProfile(id) {
	if (!id) {
		throw new RequestError('Pro získaní zákazníka je nutné zadat jeho id');
	}
	
	const profile = await prisma.customerCompany.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
			code: true,
			billingDayOfMonth: true,
			billingMode: true,
			billingEmail: true,
			customerApiKeys: {
				select: {
					id: true,
					keyPrefix: true,
					createdAt: true,
					lastUsedAt: true,
					active: true,
				},
				orderBy: { createdAt: 'asc' },
			},
		},
	});

	if (!profile) return;

	return {
		id: profile.id,
		name: profile.name,
		code: profile.code,

		billingDayOfMonth: profile.billingDayOfMonth,
		billingMode: profile.billingMode,
		billingEmail: profile.billingEmail,

		apiKeys: profile.customerApiKeys.map(apiKeyMap),
	};
}

const apiKeyMap = (key) => {
	return {
		id: key.id,
		prefix: key.keyPrefix,
		createdAt: {
			date: formatDate(key.createdAt),
			time: formatTime(key.createdAt),
		},
		lastUsedAt: {
			date: formatDate(key.lastUsedAt),
			time: formatTime(key.lastUsedAt),
			raw: key.lastUsedAt,
		},
		active: key.active,
	};
};

const customerCodeSchema = z
	.string()
	.trim()
	.regex(/^[A-Z]{3,5}$/, {
		message: 'Zkratka musí obsahovat 3 až 5 velkých písmen.',
	});

export async function addCustomer(name: string, code: string) {
	const newName = name.trim();
	const newCode = code.trim();

	if (!newName || !newCode) {
		throw new RequestError(
			'Pro vytvoření zákazníka je nutné zadat jeho název a zkratku',
		);
	}

	// customer code format validation
	const r = customerCodeSchema.safeParse(newCode);
	if (!r.success) {
		throw new RequestError(r.error.issues[0]?.message);
	}

	// customer code unique validation
	const c = await prisma.customerCompany.findUnique({
		where: { code: newCode },
	});
	if (c) throw new RequestError('Zákazník s touto zkratkou již existuje');

	await prisma.customerCompany.create({
		data: {
			name: newName,
			code: newCode,
		},
	});
}

export async function patchCustomer(id: string, name: string, code: string) {
	const newName = name.trim();
	const newCode = code.trim();

	if (!id || !newName || !newCode) {
		throw new RequestError(
			'Pro upravení zákazníka je nutné zadat jeho id, název a zkratku',
		);
	}

	const r = customerCodeSchema.safeParse(newCode);
	if (!r.success) {
		throw new RequestError(r.error.issues[0]?.message);
	}

	const existingCustomerWithCode = await prisma.customerCompany.findFirst({
		where: {
			code: newCode,
			id: { not: id },
		},
		select: { name: true },
	});

	if (existingCustomerWithCode) {
		throw new RequestError(
			`Zkratku ${newCode} již používá zákazník ${existingCustomerWithCode.name}`,
		);
	}

	await prisma.customerCompany.update({
		where: { id },
		data: {
			name: newName,
			code: newCode,
		},
	});
}

export async function deleteCustomer(id: string) {
	if (!id) {
		throw new RequestError('Pro smazání zákazníka je nutné definovat id');
	}

	try {
		await prisma.customerCompany.delete({ where: { id } });
	} catch (err) {
		console.error(err.message);

		if (
			err instanceof Prisma.PrismaClientKnownRequestError &&
			err.code === 'P2003'
		) {
			throw new RequestError(
				'Zákazníka nelze smazat, protože je navázán na další záznamy v systému (použivatelé, zásilky, API klíče, ...)',
			);
		}

		if (
			err instanceof Prisma.PrismaClientKnownRequestError &&
			err.code === 'P2025'
		) {
			throw new RequestError('Zákazník nebyl nalezen', 404);
		}
		throw err;
	}
}

export async function generateApiKeyFor(customerId: string) {
	const prefix = crypto.randomBytes(6).toString('hex');
	const secret = crypto.randomBytes(24).toString('hex');

	const apiKey = `g4api.${prefix}.${secret}`;

	const hash = await bcrypt.hash(secret, 10);

	await prisma.customerApiKey.create({
		data: {
			customerId,
			keyPrefix: prefix,
			keyHash: hash,
			version: 'v1',
		},
	});

	return apiKey;
}

export async function deleteApiKey(id: string) {
	await prisma.customerApiKey.delete({
		where: { id },
	});
}

export async function setActiveForApiKeyTo(id: string, isActive: boolean) {
	await prisma.customerApiKey.update({
		where: { id },
		data: { active: isActive },
	});
}

export async function updateCustomerBillingSettings(
	id: string,
	billingMode: BillingMode,
	billingDayOfMonth: number,
) {
	if (
		billingMode === 'MONTHLY_DAY' &&
		(!billingDayOfMonth || billingDayOfMonth < 1 || billingDayOfMonth > 15)
	) {
		throw new RequestError('Chybí počet dnů pro fakturaci pravidelně v měsíci');
	}

	if (billingMode !== 'MONTHLY_DAY' && billingDayOfMonth !== null) {
		throw new RequestError(
			'Pro požadované nastavení fakturace není možné zadat počet dnů',
		);
	}

	await prisma.customerCompany.update({
		where: { id },
		data: { billingMode, billingDayOfMonth },
	});
}
