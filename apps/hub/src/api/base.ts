/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import axios from "axios";
import router from "@/router";
import { useUserStore } from "@/stores/userStore";
import { showToast } from "@/services/toast";

const api = axios.create({
	baseURL: "/api",
	withCredentials: true,
	timeout: 15 * 1000, // 15s
	timeoutErrorMessage:
		"Server neodpovídá nebo se spojení přerušilo, skuste to znovu",
});

api.interceptors.response.use(
	(response) => response, // pass response on fulfilled
	async (error) => {
		const config = error.config ?? {};

		// use skipToast = true in config in api call
		// e.g. await api.post("/login", payload, { skipToast: true })
		if (config.skipToast === true) return Promise.reject(error);

		const res = error.response;
		const status = res?.status;
		const message = res?.data?.message;
		const details = res?.data?.details;

		switch (status) {
			// unauthorized (expired / invalid token)
			case 401:
				const user = useUserStore();
				await user.logout();

				router.push({
					path: "/login",
					query: {
						redirect: router.currentRoute.value.fullPath,
					},
				});

				showToast({
					severity: "error",
					summary: "Relace vypršela",
					detail: "Přihlašte se prosím znovu.",
					life: 6000,
				});
				break;

			// forbidden
			case 403:
				showToast({
					severity: "error",
					summary: "Chybí oprávnění",
					detail: "Na tuto akci nemáte oprávnění.",
					life: 5000,
				});
				break;

			default:
				// timeout limit hit
				if (error.code === "ECONNABORTED") {
					showToast({
						severity: "error",
						summary: error.message,
						life: 5000,
					});
					break;
				}

				const summary = details && message ? message : `Chyba ${status}`;
				const detail = details ? details : message;
				showToast({
					severity: "error",
					summary,
					detail,
					life: 5000,
				});
		}
	},
);

export default api;
