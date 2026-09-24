/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import {
	IconPoint,
	IconChecklist,
	IconTruck,
	IconCheck,
	IconRosetteDiscountCheck,
	IconCancel,
} from "@tabler/icons-vue";

// used for GTag
export const parcelStatus = {
	RECEIVED: {
		state: "RECEIVED",
		label: "Přijato",
		icon: IconPoint,
	},
	PLANNED: {
		state: "PLANNED",
		label: "Naplánováno",
		icon: IconChecklist,
	},
	LOADED: {
		state: "LOADED",
		label: "Naloženo",
		icon: IconTruck,
	},
	DELIVERED: {
		state: "DELIVERED",
		label: "Doručeno",
		icon: IconCheck,
	},
	CLOSED: {
		state: "CLOSED",
		label: "Uzavřeno",
		icon: IconRosetteDiscountCheck,
	},
	CANCELLED: {
		state: "CANCELLED",
		label: "Zrušeno",
		icon: IconCancel,
	},
} as const;

// parcels status options [{state, label, icon}, ...] array for PrimeVue Select
export const parcelStatusArray = Object.values(parcelStatus);

export type ParcelStatusKey = keyof typeof parcelStatus;
