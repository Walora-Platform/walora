<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import type { Component } from "vue";
import { IconAddressBook } from "@tabler/icons-vue";

defineProps<{
	title: string;
	subtitle?: string;
	icon?: Component;
}>();
</script>

<template>
	<div
		class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 pb-4 mb-4"
	>
		<div>
			<div class="flex items-center gap-3">
				<div
					class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold"
				>
					<component :is="icon ?? IconAddressBook" size="22" stroke="1.6" />
				</div>

				<div>
					<h2 class="text-xl font-semibold text-black">
						{{ title }}
					</h2>
					<div class="text-xs text-slate-500">
						{{ subtitle }}
					</div>
				</div>
			</div>
		</div>

		<div class="flex gap-1.5">
			<!-- USE FOR ACTIONS -->
			<slot></slot>
		</div>
	</div>
</template>
