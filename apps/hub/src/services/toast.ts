/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

// wrapper for PrimeVue ToastService
import type { ToastServiceMethods } from "primevue/toastservice";

let toast: ToastServiceMethods | null = null;

export function setToastService(instance: ToastServiceMethods) {
	toast = instance;
}

// use example: showToast({ severity, summary, detail, life })
// see https://primevue.org/toast/ 
export function showToast(options: Parameters<ToastServiceMethods["add"]>[0]) {
	toast?.add(options);
}
