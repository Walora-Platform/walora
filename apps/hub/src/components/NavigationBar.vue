<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/userStore";
import Avatar from "primevue/avatar";
import Menu from "primevue/menu";
import type { MenuItem } from "primevue/menuitem";

import {
	IconInbox,
	IconUser,
	IconSettings,
	IconLogout,
} from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const user = useUserStore();

const userMenu = ref();

const pageTitle = computed<string>(() => {
	return route.meta.pageTitle as string;
});

const currentDate = computed(() => {
	const options: Intl.DateTimeFormatOptions = {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	};
	return new Date().toLocaleDateString("cs-CZ", options);
});

const toggleUserMenu = (event: Event) => {
	userMenu.value.toggle(event);
};

const userMenuItems = ref<MenuItem[]>([
	{
		label: "Profil",
		tablerIcon: IconUser /* tabler icon component imported above */,
		command: () => router.push("/profile"),
	},
	{
		label: "Nastavení aplikace",
		tablerIcon: IconSettings,
		command: () => router.push("/settings"),
	},
	{
		separator: true,
	},
	{
		label: "Odhlásit se",
		tablerIcon: IconLogout,
		class: "text-red-600",
		command: async () => {
			await user.logout();
			router.push("/login");
		},
	},
]);
</script>

<template>
	<nav class="bg-white flex items-center px-5 py-2.5">
		<!-- left side - user greeting with on-click user menu -->
		<div
			class="flex items-center space-x-3 w-52 mr-8 p-1 pl-2 cursor-pointer hover:bg-gray-100 rounded-xl transition-colors"
			@click="toggleUserMenu"
		>
			<Avatar
				:label="`
				${
					(user?.firstName?.charAt(0) ?? '')?.toUpperCase() +
					(user?.lastName?.charAt(0) ?? '')?.toUpperCase()
				}
				`"
				class="bg-primary text-lg text-white min-w-11 min-h-11"
				shape="circle"
			/>
			<div class="select-none">
				<p class="text-xs text-gray-500">Vítejte,</p>
				<!-- TODO: format long names 1) use only the first name or 2) cut last name with '.' -->
				<p class="text-sm font-semibold text-black">
					{{ user.firstName }} {{ user.lastName }}
				</p>
			</div>

			<!-- User Menu -->
			<Menu
				ref="userMenu"
				:model="userMenuItems"
				:popup="true"
				:pt="{
					root: 'w-52 mt-2 py-1 shadow-lg border border-gray-200 rounded-xl',
					itemContent:
						'py-2 px-3 text-gray-700 text-sm hover:bg-gray-50 rounded-xl cursor-pointer transition-colors',
					separator: 'my-2 border-gray-200',
				}"
			>
				<template #item="{ item }">
					<div :class="['flex items-center gap-2', item.class || '']">
						<!-- each item can have .class specified and it will be used here -->
						<component :is="item.tablerIcon" size="18" />
						<span>{{ item.label }}</span>
					</div>
				</template>
			</Menu>
		</div>

		<!-- rest of the navigation bar -->
		<div class="flex justify-between items-center flex-1">
			<!-- page title -->
			<div>
				<h1 class="text-xl font-bold text-black">{{ pageTitle }}</h1>
				<p class="text-xs text-gray-500">
					G4PL Informační systém • {{ currentDate }}
				</p>
			</div>

			<!-- actions on right -->
			<div class="flex space-x-4">
				<!-- notifications -->
				<!-- <Button variant="ghost" badge="2">
					<IconInbox :size="18" />
					Notifikace
				</Button> -->
			</div>
		</div>
	</nav>
</template>
