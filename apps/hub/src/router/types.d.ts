/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import type {
	PermissionKeyAdmin,
	PermissionKeyCustomer,
	PermissionKeyProvider,
} from "@/services/menu/menu.types";
import "vue-router";

declare module "vue-router" {
	interface RouteMeta {
		permission?:
			| PermissionKeyProvider
			| PermissionKeyCustomer
			| PermissionKeyAdmin;
	}
}
