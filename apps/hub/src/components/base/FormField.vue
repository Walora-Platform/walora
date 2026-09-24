<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { inject } from "vue";
import Divider from "primevue/divider";

defineProps<{
	title?: string;
	subtitle?: string;
	errorMsg?: string;

	compact?: boolean;
	noDivider?: boolean;
}>();

// provide "fieldWidth" and it will be used for a field (for all fields in one component)
const width = inject("fieldWidth", "36");

// tailwind supported widths
const widthClassMap = {
	20: "w-20",
	24: "w-24",
	30: "w-30.5",
	32: "w-32",
	36: "w-36",
	40: "w-40",
	48: "w-48",
	60: "w-53",
};
</script>

<template>
	<!-- view fields -->
	<div v-if="compact" class="flex flex-col text-sm">
		<div class="flex w-full items-baseline">
			<span
				:class="[
					'text-gray-500 uppercase text-xs py-0.5',
					widthClassMap[width],
				]"
			>
				{{ title }}
				<slot name="title"></slot>
			</span>

			<div class="flex-1">
				<slot><!-- simple short string --></slot>
			</div>
		</div>
		<div v-if="$slots.details" class="flex flex-col mt-1">
			<slot name="details">
				<!-- details that will go under title, use div/span/some other tag, to have data on one row (bcs flex-col) -->
			</slot>
		</div>
		<!-- show divider, unless noDivider is set -->
		<Divider v-if="!noDivider" class="my-2" />
	</div>

	<!-- input fields -->
	<div v-else class="space-y-1.5">
		<div class="flex items-baseline gap-1">
			<h3 class="text-sm font-medium">{{ title }}</h3>
			<span class="text-xs text-gray-500">{{ subtitle }}</span>
		</div>
		<slot></slot>
		<ErrorMessage v-if="errorMsg">{{ errorMsg }}</ErrorMessage>
	</div>
</template>
