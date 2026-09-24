<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
	title: string;
	value?: string | number;
	icon: Component;
	subtitle?: string;
}>();
</script>

<template>
	<div
		class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-slate-300 hover:shadow"
	>
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<div
					class="text-[11px] font-medium uppercase tracking-wide text-slate-500"
				>
					{{ title }}
				</div>

				<div class="mt-2 text-xl font-semibold leading-none text-black">
					{{ value ?? "-" }}
				</div>

				<div v-if="subtitle" class="mt-2 text-xs text-slate-500 truncate">
					{{ subtitle }}
				</div>
			</div>

			<div
				class="flex size-8.5 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/18"
			>
				<component :is="icon" size="19" stroke="1.8" />
			</div>
		</div>

		<div
			class="pointer-events-none absolute -right-8 -bottom-10 size-20 rounded-full bg-primary/5"
		/>
	</div>
</template>
