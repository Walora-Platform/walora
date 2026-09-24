<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
defineProps<{
	visible?: boolean;
}>();
</script>

<template>
	<div
		v-if="visible"
		class="flex flex-col gap-3 absolute top-full right-0 mt-2 w-fit p-3 shadow-lg border border-gray-200 rounded-lg bg-white text-sm z-50"
	>
		<!-- menu content here -->
		<slot></slot>
	</div>
</template>
