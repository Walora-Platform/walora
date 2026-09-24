/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import type {
	MenuSection,
	MenuSectionItem,
	PermissionKeyAdmin,
	PermissionKeyCustomer,
	PermissionKeyProvider,
} from "./menu.types";

export function buildMenu(
	userPermissions: (
		| PermissionKeyProvider
		| PermissionKeyCustomer
		| PermissionKeyAdmin
	)[],
	menuConfig: readonly MenuSection[],
): MenuSection[] {
	return menuConfig
		.map((section) => {
			const items = section.items.filter((item) => {
				return userPermissions.includes(item.permission);
			});

			if (items.length === 0) return null;

			return {
				...section,
				items,
			};
		})
		.filter((section): section is MenuSection => section !== null);
}
