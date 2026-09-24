/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

/* EXAMPLE COMPOSABLE FOR STATUS UPDATING STATE -> TO KNOW WHEN TO SHOW LOADING STATE */
import { ref } from "vue";

/* set that holds ids that are being updated */
const updatingParcelIds = ref<Set<string>>(new Set());

export function useParcelStatus() {
	/* adds to set */
	function startUpdating(ids: string[]) {
		ids.forEach((id) => updatingParcelIds.value.add(id));
	}

	/* removes from set */
	function stopUpdating(ids: string[]) {
		ids.forEach((id) => updatingParcelIds.value.delete(id));
	}

	/* is id in set? is id being updated? */
	function isUpdating(id: string): boolean {
		return updatingParcelIds.value.has(id);
	}

	return {
		updatingParcelIds,
		startUpdating,
		stopUpdating,
		isUpdating,
	};
}
