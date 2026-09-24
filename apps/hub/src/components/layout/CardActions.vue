<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import {
	IconPencilX,
	IconPencilCheck,
	IconPlus,
	IconX,
} from "@tabler/icons-vue";

type Variant = "edit" | "create";

const props = defineProps<{
	variant: Variant;

	onPrimary: () => void;
	onSecondary: () => void;

	primaryText?: string;
	secondaryText?: string;

	disabled?: boolean;
	loading?: boolean;

	primaryBtnNotFluid?: boolean;
}>();

const config = {
	edit: {
		primaryText: "Uložit",
		secondaryText: "Zrušit",
		primaryIcon: IconPencilCheck,
		secondaryIcon: IconPencilX,
	},
	create: {
		primaryText: "Přidat",
		secondaryText: "Zavřít",
		primaryIcon: IconPlus,
		secondaryIcon: IconX,
	},
} as const;

const current = config[props.variant];
const iconSize = 16;
</script>

<template>
	<CardBottomActions>
		<!-- SECONDARY -->
		<Button @click="onSecondary()" :disabled="loading" variant="ghost">
			<component :is="current.secondaryIcon" :size="iconSize" />
			<span class="pr-1">{{ secondaryText ?? current.secondaryText }}</span>
		</Button>

		<!-- PRIMARY -->
		<Button
			@click="onPrimary()"
			:loading="loading"
			:disabled="disabled"
			class="flex justify-start"
			:class="{ 'flex-1': !primaryBtnNotFluid }"
		>
			<component :is="current.primaryIcon" :size="iconSize" />
			{{ primaryText ?? current.primaryText }}
		</Button>
	</CardBottomActions>
</template>
