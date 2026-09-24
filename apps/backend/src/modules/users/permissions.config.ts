/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import {
	Role,
	PermissionScope,
} from '../../config/generated/prisma-client/enums.js';

export const permissions = [
	// PROVIDER
	{ key: 'DASHBOARD', scope: PermissionScope.PROVIDER },
	{ key: 'PARCELS', scope: PermissionScope.PROVIDER },
	{ key: 'PARCELS_TRANSPORT_ORDERS', scope: PermissionScope.PROVIDER },
	{ key: 'PARCELS_TRANSPORT_CALCULATOR', scope: PermissionScope.PROVIDER },
	{ key: 'INVOICES', scope: PermissionScope.PROVIDER },
	{ key: 'PALLETS_ACCOUNT', scope: PermissionScope.PROVIDER },
	{ key: 'CARRIERS', scope: PermissionScope.PROVIDER },
	{ key: 'CUSTOMERS', scope: PermissionScope.PROVIDER },
	{ key: 'CLAIMS', scope: PermissionScope.PROVIDER },
	{ key: 'TARIFFS_CARRIERS', scope: PermissionScope.PROVIDER },
	{ key: 'TARIFFS_CUSTOMERS', scope: PermissionScope.PROVIDER },
	{ key: 'MANAGE_ACCOUNTS', scope: PermissionScope.PROVIDER },
	{ key: 'FAQ', scope: PermissionScope.PROVIDER },
	{ key: 'SUPPORT', scope: PermissionScope.PROVIDER },

	// CUSTOMER
	{ key: 'CUSTOMER_DASHBOARD', scope: PermissionScope.CUSTOMER },
	{ key: 'CUSTOMER_PARCELS', scope: PermissionScope.CUSTOMER },
	{ key: 'CUSTOMER_PARCELS_BUY_ORDERS', scope: PermissionScope.CUSTOMER },
	{ key: 'CUSTOMER_PARCELS_ORDERS_IMPORT', scope: PermissionScope.CUSTOMER },
	{ key: 'CUSTOMER_PALLETS_ACCOUNT', scope: PermissionScope.CUSTOMER },
	{ key: 'CUSTOMER_CLAIMS', scope: PermissionScope.CUSTOMER },
	{ key: 'CUSTOMER_MANAGE_ACCOUNTS', scope: PermissionScope.CUSTOMER },
	{ key: 'CUSTOMER_FAQ', scope: PermissionScope.CUSTOMER },
	{ key: 'CUSTOMER_SUPPORT', scope: PermissionScope.CUSTOMER },

	// ADMIN
	{ key: 'ADMIN_MANAGE_ACCOUNTS', scope: PermissionScope.ADMIN },
] as const;

// automatically created PermissionKey options from permissions
export type PermissionKey = (typeof permissions)[number]['key'];

const permissionsByScope = {
	PROVIDER: permissions
		.filter((p) => p.scope === PermissionScope.PROVIDER)
		.map((p) => p.key),

	CUSTOMER: permissions
		.filter((p) => p.scope === PermissionScope.CUSTOMER)
		.map((p) => p.key),

	ADMIN: permissions
		.filter((p) => p.scope === PermissionScope.ADMIN)
		.map((p) => p.key),
} as const;

type ProviderPermissionKeys = typeof permissionsByScope.PROVIDER;
type CustomerPermissionKeys = typeof permissionsByScope.CUSTOMER;

/* available permissons to PROVIDER_USER */
const providerUser = [
	'CARRIERS',
	'CLAIMS',
	'CUSTOMERS',
	'DASHBOARD',
	'INVOICES',
	'PALLETS_ACCOUNT',
	'PARCELS',
	'PARCELS_TRANSPORT_CALCULATOR',
	'PARCELS_TRANSPORT_ORDERS',
	'TARIFFS_CARRIERS',
	'TARIFFS_CUSTOMERS',
	'FAQ',
	'SUPPORT',
] as const satisfies ProviderPermissionKeys;

/* available permissions to CUSTOMER_USER */
const customerUser = [
	'CUSTOMER_DASHBOARD',
	'CUSTOMER_PARCELS',
	'CUSTOMER_CLAIMS',
	'CUSTOMER_PARCELS_ORDERS_IMPORT',
	'CUSTOMER_FAQ',
	'CUSTOMER_SUPPORT',
] as const satisfies CustomerPermissionKeys;

export const defaultPermissionsByRole: Record<Role, PermissionKey[]> = {
	PROVIDER_USER: ['DASHBOARD', 'PARCELS'],

	PROVIDER_ADMIN: [
		'MANAGE_ACCOUNTS',
		'DASHBOARD',
		'PARCELS',
		'PARCELS_TRANSPORT_CALCULATOR',
		'INVOICES',
		'PALLETS_ACCOUNT',
		'CARRIERS',
		'CUSTOMERS',
		'CLAIMS',
		'TARIFFS_CARRIERS',
		'TARIFFS_CUSTOMERS',
	],

	CUSTOMER_USER: ['CUSTOMER_DASHBOARD', 'CUSTOMER_PARCELS'],

	CUSTOMER_ADMIN: [
		'CUSTOMER_DASHBOARD',
		'CUSTOMER_PARCELS',
		'CUSTOMER_MANAGE_ACCOUNTS',
		'CUSTOMER_PARCELS_ORDERS_IMPORT',
		'CUSTOMER_PALLETS_ACCOUNT',
		'CUSTOMER_CLAIMS',
	],

	ADMIN: ['ADMIN_MANAGE_ACCOUNTS'],
};

export function getAvailablePermissionsByRole(role: Role): PermissionKey[] {
	switch (role) {
		case 'PROVIDER_USER':
			return providerUser;

		case 'PROVIDER_ADMIN':
			return permissionsByScope.PROVIDER;

		case 'CUSTOMER_USER':
			return customerUser;

		case 'CUSTOMER_ADMIN':
			return permissionsByScope.CUSTOMER;

		case 'ADMIN':
			return permissionsByScope.ADMIN.concat(permissionsByScope.PROVIDER);

		default:
			return [];
	}
}

export const mandatoryPermissionsByRole: Record<Role, PermissionKey[]> = {
	ADMIN: ['ADMIN_MANAGE_ACCOUNTS'],

	PROVIDER_ADMIN: ['MANAGE_ACCOUNTS'],

	CUSTOMER_ADMIN: ['CUSTOMER_MANAGE_ACCOUNTS'],

	PROVIDER_USER: [],
	CUSTOMER_USER: [],
};

export function buildPermissionsMap(
	role: Role,
	userPermissions: PermissionKey[],
): Record<PermissionKey, boolean> {
	const available = getAvailablePermissionsByRole(role);
	const userSet = new Set(userPermissions);

	/* { DASHBOARD: true, INVOICES: false, ... } */
	return Object.fromEntries(
		available.map((key) => [key, userSet.has(key)]),
	) as Record<PermissionKey, boolean>;
}

const mapKeysByScope = (scope: PermissionScope) => {
	return permissions.filter((p) => p.scope === scope).map((p) => p.key);
};
