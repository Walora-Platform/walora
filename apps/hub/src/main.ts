/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router/index.ts";

/* Pinia - state management */
import { createPinia } from "pinia";
const pinia = createPinia();

/* PrimeVue */
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";
import Tooltip from "primevue/tooltip";

/* PrimeVue Theme */
import Aura from "@primeuix/themes/aura";
import { definePreset } from "@primeuix/themes";

/* PrimeUI license key  */
const primeUiLicenseKey = import.meta.env.VITE_PRIMEUI_LICENSE_KEY;

const AuraCustom = definePreset(Aura, {
	semantic: {
		primary: {
			500: "var(--color-blue-600)",
			600: "var(--color-blue-700)",
		},
	},
});

/* Create app, install plugins and mount it to DOM */
createApp(App)
	.use(router)
	.use(pinia)
	.use(PrimeVue, {
		license: primeUiLicenseKey,
		locale: {
			/* https://primevue.org/configuration/#locale */
			/* DatePicker */
			firstDayOfWeek: 1,
			dayNamesMin: ["Ne", "Po", "Ut", "St", "Št", "Pá", "So"],
			monthNames: [
				"Leden",
				"Únor",
				"Březen",
				"Duben",
				"Květen",
				"Červen",
				"Červenec",
				"Srpen",
				"Září",
				"Říjen",
				"Listopad",
				"Prosinec",
			],
			monthNamesShort: [
				"Led",
				"Úno",
				"Bře",
				"Dub",
				"Kvě",
				"Čvn",
				"Čvc",
				"Srp",
				"Zář",
				"Říj",
				"Lis",
				"Pro",
			],
			/* MultiSelect */
			/* selectionMessage: '', */
		},
		theme: {
			preset: AuraCustom,
			options: {
				darkModeSelector: false,
				cssLayer: {
					name: "primevue",
					order: "theme, base, primevue",
				},
			},
		},
	})
	.use(ToastService)
	.use(ConfirmationService)
	.directive("tooltip", Tooltip) // use v-tooltip="MESSAGE" on any element (see https://primevue.org/tooltip/)
	.mount("#app");
