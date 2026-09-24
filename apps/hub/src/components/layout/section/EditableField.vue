<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
defineProps<{
	label: string;
	value?: string | number | null;
	editing?: boolean; /* use for isEditing from EditableSectionCard provided in default slot */
}>();
</script>

<template>
	<div>
		<div class="text-[11px] font-medium uppercase tracking-wide text-slate-500">
			{{ label }}
		</div>

		<!-- EDIT -->
		<div v-if="editing" class="mt-1">
			<slot name="edit" />
		</div>

		<!-- READ -->
		<div v-else class="mt-1 text-sm text-slate-900">
			<slot>
				<!-- this is default value for the slot -->
				{{ value || "—" }}
			</slot>
		</div>
	</div>
</template>
