/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import {
	IconFileSpark,
	IconCheck,
	IconX,
	IconMap,
	IconAutomation,
} from "@tabler/icons-vue";

export const billingBatchStatus = {
	DRAFT: {
		status: "PLANNED",
		label: "Vytvořeno",
		icon: IconAutomation,
	},
	FINALIZED: {
		status: "DELIVERED",
		label: "Uzavřeno",
		icon: IconCheck,
	},
};

export const billingBatchError = {
	TARIFF_NOT_FOUND: {
		status: "CANCELLED",
		label: "Tarif nenalezen",
		icon: IconX,
	},
};

export const billingItemError = {
	ZONE_NOT_FOUND: {
		status: "CANCELLED",
		label: "Zóna nenalezena",
		icon: IconMap,
	},
	RATE_NOT_FOUND: {
		status: "CANCELLED",
		label: "Sazba nenalezena",
		icon: IconX,
	},
};
