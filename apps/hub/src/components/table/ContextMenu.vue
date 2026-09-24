<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref } from "vue";
import type { MenuItem } from "primevue/menuitem";
import ContextMenu from "primevue/contextmenu";
import { IconChevronRight } from "@tabler/icons-vue";

const props = defineProps<{
	items: MenuItem[];
}>();

const emit = defineEmits<{
	(e: "openMenu", event: MouseEvent): void;
}>();

const cmRef = ref(null);

function openMenu(event: MouseEvent) {
	if (!cmRef.value) return;

	cmRef.value.show(event);
	emit("openMenu", event);
}

// parent can ref="contextMenu" (contextMenu = ref()) contextMenu.openMenu()
defineExpose({ openMenu });
</script>

<template>
	<ContextMenu
		ref="cmRef"
		:model="props.items"
		:pt="{
			root: 'text-sm rounded-lg',
			itemContent: 'bg-transparent',
		}"
	>
		<template #item="{ item, props }">
			<div
				:class="[
					'flex items-center gap-3 px-3 py-1.5 rounded-lg',
					item.command ? 'cursor-pointer' : 'cursor-default',
					item.warnColor
						? 'hover:bg-amber-100'
						: item.deleteColor
							? 'hover:bg-red-100'
							: 'hover:bg-zinc-100',
				]"
			>
				<!-- icon (specify item.tablerIcon) -->
				<component v-if="item.tablerIcon" :is="item.tablerIcon" size="16" />

				<!-- status submenu -->
				<Tag
					v-if="item.statusState"
					:icon="item.statusIcon"
					:label="item.label"
					:status="item.statusState"
				/>

				<!-- label -->
				<span v-else class="mr-auto">{{ item.label }}</span>

				<!-- chevron icon if item has items -->
				<IconChevronRight v-if="item.items" size="14" class="text-slate-500" />
			</div>
		</template>
	</ContextMenu>
</template>
