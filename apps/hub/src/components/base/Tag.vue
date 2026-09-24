<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { computed, type Component } from "vue";

import { IconRefreshDot } from "@tabler/icons-vue";

const props = defineProps<{
	variant?:
		| "default"
		| "ACTIVE"
		| "INACTIVE"
		| "ARCHIVED"
		| "PLUSCOUNT"
		| "TREND-UP"
		| "TREND-DOWN"
		| "KPI-PRIMARY"; // active, inactive, archived are for tariff state pills; default, plusCount are for carriers pills, trends are for dashboard tags
	status?: "RECEIVED" | "PLANNED" | "DELIVERED" | "CLOSED" | "DONE"; // status prop is meant for parcel status
	label?: string;
	icon?: Component;
	iconOnly?: boolean;
	triangle?: boolean;
	loading?: boolean;
}>();

const selectedVersion = computed(() => {
	if (props.variant) return props.variant;
	else if (props.status) return props.status;
	else return "default";
});
</script>

<template>
	<span
		:class="[
			'g-tag',
			`g-tag-${selectedVersion}`,
			{
				'g-tag-status-styling':
					status ||
					(variant &&
						variant !== 'PLUSCOUNT' &&
						!variant.includes('TREND') &&
						!variant.includes('KPI')),
			},
		]"
	>
		<!-- either use the slot -->
		<slot></slot>

		<!-- or set icon and label props -->
		<span class="relative">
			<!-- will blur on loading -->
			<span class="flex items-center" :class="{ 'blur-2xl': loading }">
				<!-- icon on left -->
				<component :is="props.icon" :size="12" :class="{ 'mr-1': !iconOnly }" />

				<!-- label -->
				{{ label }}
			</span>

			<!-- loading state -->
			<span
				v-if="loading"
				class="absolute inset-0 flex justify-center items-center"
			>
				<IconRefreshDot size="12" class="animate-spin" />
			</span>
		</span>
	</span>
</template>
