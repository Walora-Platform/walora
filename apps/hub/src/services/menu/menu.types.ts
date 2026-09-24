/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import type { Component } from "vue";

export type PermissionKeyProvider =
	| "DASHBOARD"
	| "PARCELS"
	| "PARCELS_TRANSPORT_ORDERS"
	| "PARCELS_TRANSPORT_CALCULATOR"
	| "INVOICES"
	| "PALLETS_ACCOUNT"
	| "CARRIERS"
	| "CUSTOMERS"
	| "CLAIMS"
	| "TARIFFS_CARRIERS"
	| "TARIFFS_CUSTOMERS"
	| "MANAGE_ACCOUNTS"
	| "FAQ"
	| "SUPPORT";

export type PermissionKeyCustomer =
	| "CUSTOMER_DASHBOARD"
	| "CUSTOMER_PARCELS"
	| "CUSTOMER_PARCELS_ORDERS"
	| "CUSTOMER_PALLETS_ACCOUNT"
	| "CUSTOMER_CLAIMS"
	| "CUSTOMER_MANAGE_ACCOUNTS"
	| "CUSTOMER_FAQ"
	| "CUSTOMER_SUPPORT";

export type PermissionKeyAdmin = "ADMIN_MANAGE_ACCOUNTS";

export interface MenuSectionItem {
	name: string;
	to?: string;
	icon?: Component;
	permission:
		| PermissionKeyProvider
		| PermissionKeyCustomer
		| PermissionKeyAdmin;
}

export interface MenuSection {
	section: string;
	items: MenuSectionItem[];
}
