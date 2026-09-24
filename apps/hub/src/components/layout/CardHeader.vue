<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
const props = defineProps<{
	title: String;
	subtitle?: String;
	loginHeader?: boolean;
	sideContentHeader?: boolean;
}>();
</script>

<template>
	<div
		:class="[
			'flex justify-between items-start',
			loginHeader ? 'mb-4.5' : sideContentHeader ? 'mb-3.5' : 'mb-6 h-8',
		]"
	>
		<div>
			<h1 :class="['font-semibold', loginHeader ? 'text-xl' : 'text-lg']">
				{{ props.title }}
			</h1>

			<p class="text-xs text-gray-500">
				{{ props.subtitle }}
			</p>
		</div>
		<div class="flex items-start gap-2">
			<slot></slot>
		</div>
	</div>
</template>
