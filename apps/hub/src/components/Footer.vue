<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
	<div class="flex gap-0.5 items-center mb-4 text-gray-700 text-xs">
		2025-{{ currentYear }} | Developed by
		<span class="font-bold">Tomáš Bordák</span>
	</div>
</template>
