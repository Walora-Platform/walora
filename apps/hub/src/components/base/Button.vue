<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { computed } from "vue";
import Button from "primevue/button";
import Badge from "primevue/badge";
import { IconLoader2 } from "@tabler/icons-vue";

const props = defineProps<{
	variant?:
		| "primary" // main CTO (default)
		| "soft-primary" // secondary CTO
		| "secondary"
		| "ghost" // "close", "dismiss changes"
		| "danger"
		| "warn" // "archive"
		| "outlined";
	size?: "md" | "lg"; // default: md
	disabled?: boolean;
	scale?: boolean;
	loading?: boolean;
	badge?: boolean | string;
}>();

const badgeValue = computed(() => {
	// check if badge is boolean or not
	// returns null if boolean
	// returns the value if not boolean
	return typeof props.badge === "boolean" ? undefined : props.badge;
});
</script>

<template>
	<Button
		:disabled="disabled"
		:class="[
			'g-button',
			`g-button-${variant ?? 'primary'}`, // default is primary
			`g-button-${size ?? 'md'}`,
			{ 'hover:scale-105': scale && !disabled },
			{ 'pointer-events-none': disabled || loading },
		]"
	>
		<!-- use this slot for label, icon... -->
		<slot></slot>

		<!-- if loading is true, the slot will dissapear and loading spinner will show -->
		<span
			v-if="loading"
			class="absolute inset-0 flex items-center justify-center bg-gray-100/90 rounded-xl"
		>
			<IconLoader2 size="18" class="animate-spin" />
		</span>

		<Badge
			v-if="badge"
			:value="badgeValue"
			class="absolute outline-white bg-green-500"
			:class="
				badgeValue
					? 'min-w-5 min-h-5 -top-2 -right-1.5 outline-2'
					: 'min-w-2.5 max-h-2.5 -top-0.5 -right-0.5 outline-4'
			"
		/>
	</Button>
</template>
