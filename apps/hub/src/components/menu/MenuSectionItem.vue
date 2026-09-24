<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { type Component } from "vue";
import { useRoute } from "vue-router";
import { useLayoutStore } from "@/stores/layoutStore";

const props = defineProps<{
	to: string /* to path */;
	name: String;
	icon: Component;
}>();

const route = useRoute();
const layout = useLayoutStore();

const isActive = () => {
	return route.path === props.to
		? "bg-primary text-white"
		: "text-gray-700 hover:bg-gray-100";
};
</script>

<template>
	<!-- this will go inside <ul> -->
	<li>
		<router-link
			:to="props.to"
			class="flex px-3 py-2.5 rounded-xl text-sm items-center overflow-hidden"
			:class="[isActive(), layout.sidebarCollapsed ? 'justify-center' : '']"
		>
			<!-- item icon -->
			<component :is="props.icon" :size="20" />

			<!-- item name -->
			<span
				v-show="!layout.sidebarCollapsed"
				class="whitespace-nowrap transition-opacity ease-out origin-left"
				:class="
					layout.sidebarCollapsed
						? 'opacity-0 scale-x-0 w-0 overflow-hidden'
						: 'opacity-100 scale-x-100 ml-3'
				"
			>
				{{ props.name }}
			</span>
		</router-link>
	</li>
</template>
