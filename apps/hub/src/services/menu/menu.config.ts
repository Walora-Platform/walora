/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import type { MenuSection } from "./menu.types";
import {
	IconLayoutDashboard,
	IconPackage,
	IconTransferVertical,
	IconCalculator,
	IconInvoice,
	IconTransform,
	IconTruck,
	IconUsers,
	IconUsersGroup,
	IconMailExclamation,
	IconQuestionMark,
	IconHeadphones,
	IconFileImport,
	IconFileInvoice,
} from "@tabler/icons-vue";

export const MENU_CONFIG: readonly MenuSection[] = [
	{
		section: "HLAVNÍ MENU",
		items: [
			// provider
			{
				name: "Dashboard",
				to: "/dashboard",
				icon: IconLayoutDashboard,
				permission: "DASHBOARD",
			},
			{
				name: "Zásilky",
				to: "/parcels",
				icon: IconPackage,
				permission: "PARCELS",
			},
			{
				name: "Objednávky přeprav",
				to: undefined,
				icon: IconTransferVertical,
				permission: "PARCELS_TRANSPORT_ORDERS",
			},
			{
				name: "Kalkulace přeprav",
				to: undefined,
				icon: IconCalculator,
				permission: "PARCELS_TRANSPORT_CALCULATOR",
			},
			{
				name: "Fakturace",
				to: "/billing",
				icon: IconInvoice,
				permission: "INVOICES",
			},
			{
				name: "Paletové konto",
				to: undefined,
				icon: IconTransform,
				permission: "PALLETS_ACCOUNT",
			},
			{
				name: "Reklamace",
				to: undefined,
				icon: IconMailExclamation,
				permission: "CLAIMS",
			},
			{
				name: "Dopravci",
				to: "/carriers",
				icon: IconTruck,
				permission: "CARRIERS",
			},
			{
				name: "Zákazníci",
				to: "/customers",
				icon: IconUsers,
				permission: "CUSTOMERS",
			},
			// customer
			{
				name: "Dashboard",
				to: "/customer/dashboard",
				icon: IconLayoutDashboard,
				permission: "CUSTOMER_DASHBOARD",
			},
			{
				name: "Zásilky",
				to: "/customer/parcels",
				icon: IconPackage,
				permission: "CUSTOMER_PARCELS",
			},
			{
				name: "Nákupní objednávky",
				to: "/customer/orders/buy",
				icon: IconFileInvoice,
				permission: "CUSTOMER_PARCELS_BUY_ORDERS",
			},
			{
				name: "Objednání přepravy",
				to: "/customer/import",
				icon: IconFileImport,
				permission: "CUSTOMER_PARCELS_ORDERS_IMPORT",
			},
			{
				name: "Paletové konto",
				to: "/customer/pallets",
				icon: IconTransform,
				permission: "CUSTOMER_PALLETS_ACCOUNT",
			},
			{
				name: "Reklamace",
				to: "/customer/claims",
				icon: IconMailExclamation,
				permission: "CUSTOMER_CLAIMS",
			},
		],
	},
	{
		section: "TARIFY",
		items: [
			// provider
			{
				name: "Tarify dopravců",
				to: "/carriers/tariffs",
				icon: IconTruck,
				permission: "TARIFFS_CARRIERS",
			},
			{
				name: "Tarify zákazníků",
				to: "/customers/tariffs",
				icon: IconUsers,
				permission: "TARIFFS_CUSTOMERS",
			},
		],
	},
	{
		section: "SPRÁVA",
		items: [
			// provider
			{
				name: "Správa účtů",
				to: undefined,
				icon: IconUsersGroup,
				permission: "MANAGE_ACCOUNTS",
			},
			// customer
			{
				name: "Správa účtů",
				to: "/customer/users",
				icon: IconUsersGroup,
				permission: "CUSTOMER_MANAGE_ACCOUNTS",
			},
			// admin
			{
				name: "Správa účtů",
				to: "/admin/users",
				icon: IconUsersGroup,
				permission: "ADMIN_MANAGE_ACCOUNTS",
			},
		],
	},
	{
		section: "OSTATNÍ",
		items: [
			// customer
			{
				name: "FAQ",
				to: "/customer/FAQ",
				icon: IconQuestionMark,
				permission: "CUSTOMER_FAQ",
			},
			{
				name: "Kontaktovat podporu",
				to: "/customer/support",
				icon: IconHeadphones,
				permission: "CUSTOMER_SUPPORT",
			},
		],
	},
] as const;
