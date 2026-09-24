<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import {
	IconArrowsSort,
	IconSortAscending,
	IconSortDescending,
} from "@tabler/icons-vue";

defineProps<{
	sorted: boolean | null;
	sortOrder?: 1 | -1;
}>();
</script>

<template>
	<span>
		<!-- not sorted -->
		<IconArrowsSort v-if="!sorted" size="15" class="g-sort-icon" />

		<!-- ascending -->
		<IconSortAscending
			v-else-if="sortOrder === 1"
			size="15"
			class="text-primary g-sort-icon"
		/>

		<!-- descending -->
		<IconSortDescending v-else size="15" class="text-primary g-sort-icon" />
	</span>
</template>
