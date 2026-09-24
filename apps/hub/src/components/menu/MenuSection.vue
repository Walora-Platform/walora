<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layoutStore";

const props = defineProps<{
	title: string;
}>();

const layout = useLayoutStore();
</script>

<template>
	<div
		class="pb-1"
		:class="layout.sidebarCollapsed ? 'px-2 pt-3' : 'px-4 pt-5'"
	>
		<p
			class="text-xs text-gray-500 mb-2 uppercase"
			:class="layout.sidebarCollapsed ? 'text-center' : ''"
		>
			<!-- section title -->
			{{ props.title }}
		</p>
		<nav>
			<ul class="space-y-1">
				<!-- slot for MenuSectionItem(s) -->
				<slot></slot>
			</ul>
		</nav>
	</div>
</template>
