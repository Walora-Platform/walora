<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import type { Component } from "vue";
import InputText from "primevue/inputtext";
import FloatLabel from "primevue/floatlabel";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import { IconX } from "@tabler/icons-vue";

const model = defineModel<string | undefined>(); /* v-model */

defineProps<{
	id: string;
	label: string;
	icon: Component;
	useClear?: boolean;
}>();
</script>

<template>
	<FloatLabel variant="on" class="group">
		<IconField>
			<InputIcon class="pl-px">
				<component :is="icon" size="14" />
			</InputIcon>

			<InputText
				:id="id"
				v-model="model"
				size="small"
				class="w-50 rounded-2xl py-2 pl-9 pr-7 group-hover:border-slate-400 group-focus-within:border-primary!"
			/>

			<!-- clear input icon (set useClear) -->
			<button
				v-if="model && useClear"
				type="button"
				@click="model = undefined"
				class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600 p-1"
			>
				<IconX size="15" />
			</button>
		</IconField>
		<label :for="id" class="text-xs left-9">
			{{ label }}
		</label>
	</FloatLabel>
</template>
