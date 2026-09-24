/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { defineStore } from "pinia";
import { ref } from "vue";

export const useLayoutStore = defineStore("layout", () => {
	const sidebarCollapsed = ref<boolean>(false);
	const storedInSession = sessionStorage.getItem("sidebarCollapsed");

	if (storedInSession != null) {
		if (storedInSession === "true") sidebarCollapsed.value = true;
		if (storedInSession === "false") sidebarCollapsed.value = false;
	}

	const toggleSidebar = () => {
		sidebarCollapsed.value = !sidebarCollapsed.value;
		sessionStorage.setItem("sidebarCollapsed", sidebarCollapsed.value);
	};

	return {
		sidebarCollapsed,
		toggleSidebar,
	};
});
