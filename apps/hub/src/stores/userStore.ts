/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { ref } from "vue";
import { defineStore } from "pinia";
import axios from "axios";
import api from "@/api/base";
import router from "../router";
import type {
	PermissionKeyAdmin,
	PermissionKeyCustomer,
	PermissionKeyProvider,
} from "@/services/menu/menu.types";

type UserRole =
	| "PROVIDER_USER"
	| "PROVIDER_ADMIN"
	| "CUSTOMER_USER"
	| "CUSTOMER_ADMIN"
	| "ADMIN";

interface CustomerCompany {
	id: string;
	code: string;
	name: string;
	createdAt: string;
}

export const useUserStore = defineStore("user", () => {
	const isAuthenticated = ref<boolean>(false);
	const id = ref<string | null>(null);
	const username = ref<string | null>(null);
	const email = ref<string | null>(null);
	const firstName = ref<string | null>(null);
	const lastName = ref<string | null>(null);
	const role = ref<UserRole | null>(null);
	const permissions = ref<
		(PermissionKeyProvider | PermissionKeyAdmin | PermissionKeyCustomer)[]
	>([]);
	const customerCompany = ref<CustomerCompany | null>(null);
	const createdAt = ref<string | null>(null);

	const login = async (username: string, password: string) => {
		try {
			const res = await api.post(
				"/auth/login",
				{
					username: username,
					password: password,
				},
				{ skipToast: true },
			);

			const { data } = res;

			fillDetails(
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

			return { isSuccessful: true };
		} catch (err: any) {
			const backendCode = err.response.data.code; // 0, 1, undefined
			let code = backendCode !== undefined ? backendCode : err.status;

			return { isSuccessful: false, errCode: code };
		}
	};

	const logout = async () => {
		await api.post("/auth/logout");
		fillDetails(); // will reset all values
	};

	const can = (permission) => {
		return permissions.value.includes(permission);
	};

	// on default it puts the details in logged out state
	function fillDetails(
		isAuthenticatedValue = false,
		idValue = null,
		usernameValue = null,
		emailValue = null,
		firstNameValue = null,
		lastNameValue = null,
		roleValue = null,
		permissionsValue = [],
		customerCompanyValue = null,
		createdAtValue = null,
	) {
		isAuthenticated.value = isAuthenticatedValue;
		id.value = idValue;
		username.value = usernameValue;
		email.value = emailValue;
		firstName.value = firstNameValue;
		lastName.value = lastNameValue;
		role.value = roleValue;
		permissions.value = permissionsValue;
		customerCompany.value = customerCompanyValue;
		createdAt.value = createdAtValue;
	}

	/* return everything that needs to be used outside from this store */
	return {
		login,
		logout,
		can,
		fillDetails,
		isAuthenticated,
		id,
		username,
		email,
		firstName,
		lastName,
		role,
		permissions,
		customerCompany,
		createdAt,
	};
});
