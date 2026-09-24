<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import type { Component } from "vue";
defineProps<{
	icon: Component;
}>();
</script>

<template>
	<button
		class="p-[5px] text-gray-600 hover:bg-gray-200 rounded-full cursor-pointer transition-[background-color]"
	>
		<component :is="icon" size="16" />
	</button>
</template>
