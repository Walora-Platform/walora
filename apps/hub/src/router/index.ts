/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import axios from "axios";
import MainLayout from "@/layouts/MainLayout.vue";
import { useUserStore } from "../stores/userStore";

const routes: RouteRecordRaw[] = [
	/* public access - unauthenticated users */
	{
		path: "/login",
		component: () => import("@/views/Login.vue"),
	},

	/* private access - authenticated users */
	{
		path: "/",
		component: MainLayout,
		meta: { requiresAuth: true },
		children: [
			/***********************/
			/***** USER ROUTES *****/
			/***********************/
			{
				path: "profile",
				meta: { pageTitle: "Uživatelský profil" },
				component: () => import("@/views/Profile.vue"),
			},
			{
				path: "settings",
				meta: { pageTitle: "Nastavení" },
				component: () => import("@/views/PageIncoming.vue"),
			},

			/***********************/
			/*** PROVIDER ROUTES ***/
			/***********************/
			{
				path: "dashboard",
				meta: { pageTitle: "Dashboard", permission: "DASHBOARD" },
				component: () => import("@/views/provider/DashboardView.vue"),
			},
			{
				path: "parcels",
				meta: { pageTitle: "Zásilky", permission: "PARCELS" },
				component: () => import("@/views/provider/ParcelsView.vue"),
			},
			{
				path: "billing",
				meta: { pageTitle: "Fakturace", permission: "INVOICES" },
				component: () => import("@/views/provider/BillingView.vue"),
			},
			{
				path: "carriers" /* all carriers view */,
				meta: { pageTitle: "Dopravci", permission: "CARRIERS" },
				component: () => import("@/views/provider/CarriersView.vue"),
			},
			{
				path: "carriers/tariffs" /* all tariffs of carriers view */,
				meta: { pageTitle: "Tarify dopravců", permission: "TARIFFS_CARRIERS" },
				component: () => import("@/views/provider/CarriersTariffsView.vue"),
			},
			{
				path: "customers" /* all customers view */,
				meta: { pageTitle: "Zákazníci", permission: "CUSTOMERS" },
				component: () => import("@/views/provider/CustomersView.vue"),
			},
			{
				path: "customers/tariffs" /* all tariffs of customers view */,
				meta: {
					pageTitle: "Tarify zákazníků",
					permission: "TARIFFS_CUSTOMERS",
				},
				component: () => import("@/views/provider/CustomersTariffsView.vue"),
			},

			/************************/
			/*** CUSTOMERS ROUTES ***/
			/************************/
			{
				path: "customer",
				children: [
					{
						path: "parcels",
						meta: { pageTitle: "Zásilky", permission: "CUSTOMER_PARCELS" },
						component: () => import("@/views/customer/ParcelsView.vue"),
					},
					{
						path: "dashboard",
						meta: { pageTitle: "Dashboard", permission: "CUSTOMER_DASHBOARD" },
						component: () => import("@/views/customer/DashboardView.vue"),
					},
					{
						path: "pallets",
						meta: {
							pageTitle: "Paletové konto",
							permission: "CUSTOMER_PALLETS_ACCOUNT",
						},
						component: () => import("@/views/customer/PalletsAccountView.vue"),
					},
					{
						path: "import",
						meta: {
							pageTitle: "Objednání přepravy",
							permission: "CUSTOMER_PARCELS_ORDERS_IMPORT",
						},
						component: () => import("@/views/customer/OrdersImportView.vue"),
					},
					{
						path: "claims",
						meta: { pageTitle: "Reklamace", permission: "CUSTOMER_CLAIMS" },
						component: () => import("@/views/PageIncoming.vue"),
					},
					{
						path: "users",
						meta: {
							pageTitle: "Správa účtů",
							permission: "CUSTOMER_MANAGE_ACCOUNTS",
						},
						component: () => import("@/views/PageIncoming.vue"),
					},
					{
						path: "faq",
						meta: { pageTitle: "FAQ", permission: "CUSTOMER_FAQ" },
						component: () => import("@/views/PageIncoming.vue"),
					},
					{
						path: "support",
						meta: {
							pageTitle: "Zákaznická podpora",
							permission: "CUSTOMER_SUPPORT",
						},
						component: () => import("@/views/PageIncoming.vue"),
					},
				],
			},
			/************************/
			/***** ADMIN ROUTES *****/
			/************************/
			{
				path: "admin",
				children: [
					{
						path: "users",
						meta: {
							pageTitle: "Správa účtů",
							permission: "ADMIN_MANAGE_ACCOUNTS",
						},
						component: () => import("@/views/admin/ManageUserAccounts.vue"),
					},
				],
			},
		],
	},
	/* 404 PATH -> NOT FOUND */
	{
		path: "/404",
		component: () => import("@/views/404.vue"),
	},

	/* 403 PATH -> FORBIDDEN */
	{
		path: "/403",
		component: () => import("@/views/403.vue"),
	},

	/* PATH NOT FOUND SINK */
	{
		path: "/:pathMatch(.*)*",
		redirect: "/404", // root path will get redirected to default route
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

let triedTokenCookie = false;

async function tryAuthenticate(user: any) {
	try {
		const { data } = await axios.get("/api/auth/check", {
			withCredentials: true,
		});

		user.fillDetails(
			true,
			data.id,
			data.username,
			data.email,
			data.firstName,
			data.lastName,
			data.role,
			data.permissions,
			data.customerCompany,
			data.createdAt,
		);

		return true;
	} catch (err) {
		user.isAuthenticated = false;
		return false;
	}
}

const checkPermission = (permissions: string[], permission: string) => {
	return permissions && permissions.includes(permission);
};

function getDefaultRouteWithPermissionCheck(
	role: string,
	permissions: string[],
	routes,
): string {
	function handleNoPermissionForDefaultRoute() {
		return findFirstAllowedRoute(routes, permissions) ?? "/403";
	}

	switch (role) {
		case "CUSTOMER_USER":
		case "CUSTOMER_ADMIN": {
			const defaultRoute = "/customer/dashboard";

			if (checkPermission(permissions, "CUSTOMER_DASHBOARD")) {
				return defaultRoute;
			}
			break;
		}

		case "PROVIDER_USER":
		case "PROVIDER_ADMIN": {
			const defaultRoute = "/parcels";

			if (checkPermission(permissions, "PARCELS")) {
				return defaultRoute;
			}
			break; // to handle no permission for default route in sink after switch
		}

		case "ADMIN": {
			const defaultRoute = "/admin/users";

			if (checkPermission(permissions, "ADMIN_MANAGE_ACCOUNTS")) {
				return defaultRoute;
			}
			break;
		}

		default:
			return "/404";
	}

	// sink
	return handleNoPermissionForDefaultRoute();
}

router.beforeEach(async (to, from) => {
	const user = useUserStore();

	// try authenticating from cookie once
	if (!triedTokenCookie) {
		triedTokenCookie = true;
		await tryAuthenticate(user); // auth from token cookie

		if (!user.isAuthenticated) {
			// if token expired, the path will already include redirect query from axios interceptor
			if (to.query.redirect) return to.fullPath;

			// let user go to "/login", no redirect to /login needed
			if (to.fullPath === "/login") return;

			// redirection to "/" would make no sense, hence no redirect is attached
			if (to.fullPath === "/") return "/login";

			// default - when user just wants to go to app, but is not authenticated (e.g. when they store a bookmark to the app page)
			// adds redirect query, so app will route user after successful login
			// the route redirection logic is at views/Login.vue
			return {
				path: "/login",
				query: {
					redirect: to.fullPath, // redirect user after login to where they wanted to go
				},
			};
		}
	}

	// protected router and not authenticated
	if (!user.isAuthenticated && to.path !== "/login") {
		return { path: "/login" };
	}

	// logged-in user trying to access '/login' or '/'
	if (user.isAuthenticated && (to.path === "/login" || to.path === "/")) {
		return {
			path: getDefaultRouteWithPermissionCheck(
				user.role,
				user.permissions,
				routes,
			),
		};
	}

	const requiredPermission = to.meta.permission as string | undefined;

	// permissions check
	if (requiredPermission && !user.can(requiredPermission)) return "/"; // will get redirected from "/" to default route

	// all good
	return true;
});

export default router;

// parentPath enables flattenRoutes to be used recursively
function flattenRoutes(routes, parentPath = "") {
	const result = [];
	const moreThanOneSlash = /\/+/g;

	for (const route of routes) {
		const fullPath = route.path.startsWith("/")
			? route.path
			: `${parentPath}/${route.path}`.replace(moreThanOneSlash, "/");

		if (route.meta?.permission) {
			result.push({
				path: fullPath,
				permission: route.meta.permission,
			});
		}

		// recursively parse children routes
		// fullPath
		if (route.children) {
			result.push(...flattenRoutes(route.children, fullPath));
		}
	}

	return result;
}

function findFirstAllowedRoute(routes, permissions: string[]): string | null {
	const flat = flattenRoutes(routes);
	for (const route of flat) {
		if (permissions.includes(route.permission)) return route.path;
	}

	return null;
}
