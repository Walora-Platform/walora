<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
const props = defineProps(["value", "currency"]);

const formatCurrency = (value) => {
	return new Intl.NumberFormat("cs-CZ").format(value);
};
</script>

<template>
	<div class="space-x-0.5">
		<span>{{ formatCurrency(value) }}</span>
		<span>{{ currency }}</span>
	</div>
</template>
