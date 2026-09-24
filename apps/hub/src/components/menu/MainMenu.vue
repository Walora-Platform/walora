<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { computed, ref } from "vue";
import { useLayoutStore } from "@/stores/layoutStore";
import { useUserStore } from "@/stores/userStore";
import { buildMenu } from "@/services/menu/menu.build";
import { MENU_CONFIG } from "@/services/menu/menu.config";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-vue";

const layout = useLayoutStore();
const user = useUserStore();

const menuItems = computed(() => buildMenu(user.permissions, MENU_CONFIG));
</script>

<template>
	<aside
		class="relative bg-white pb-3 shadow rounded-2xl overflow-hidden flex flex-col h-fit max-h-full transition-all duration-200"
		:class="layout.sidebarCollapsed ? 'w-16 min-w-16' : 'w-60 min-w-60'"
	>
		<!-- COLLAPSE MENU TOGGLE BUTTON  -->
		<button
			@click="layout.toggleSidebar"
			:class="[
				'flex bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer transition',
				layout.sidebarCollapsed
					? 'w-full py-2 rounded-tr-2xl rounded-tl-2xl justify-center'
					: 'absolute right-0 p-2 rounded-tr-2xl rounded-bl-xl',
			]"
		>
			<IconChevronLeft v-if="!layout.sidebarCollapsed" :size="16" />
			<IconChevronRight v-else :size="16" />
		</button>

		<div class="overflow-y-auto no-scrollbar">
			<!-- MENU SECTIONS WITH NAVIGATION ITEMS -->
			<MenuSection v-for="section in menuItems" :title="section.section">
				<MenuSectionItem
					v-for="item in section.items"
					:name="item.name"
					:to="item.to ?? '/'"
					:icon="item.icon"
				/>
			</MenuSection>
		</div>
	</aside>
</template>
