<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref } from "vue";
import type { Component } from "vue";
import FileUpload from "primevue/fileupload";

// component emits 'fileSelected' everytime a file is selected, returns the selected file or null (use with @fileSelected)
const emit = defineEmits<{
	(e: "fileSelected", file: File | null): void;
}>();

const props = defineProps<{
	label: string;
	icon?: Component;
	invalid?: boolean;
}>();

/* 
use ref="fileUploadRef" attribute on this component that will have clear() function available 
then usefileUploadRef.value.clear() to clear the selected file 
*/
const fileUploadRef = ref();
const selectedFilename = ref<string | null>();

function onSelect(event: any) {
	const file = event.files.at(-1); // last selected
	selectedFilename.value = file.name;
	emit("fileSelected", file); // emit the selected file
}

function clear() {
	selectedFilename.value = null;
	fileUploadRef.value?.clear();
}

// use with the variable const thisRef=ref(); then specify ref="thisRef" on this component and then use thisRef.value.clear()
defineExpose({ clear });
</script>

<template>
	<FileUpload
		ref="fileUploadRef"
		mode="advanced"
		customUpload
		class="g-button"
		:auto="false"
		@select="onSelect"
		:pt="{
			root: 'border-none',
			header: 'p-0',
			content: 'p-0 border-none',
		}"
	>
		<template #header="{ chooseCallback }">
			<Button
				@click="chooseCallback()"
				class="flex-1 z-20 justify-start"
				size="lg"
				:variant="props.invalid ? 'invalid' : 'primary'"
			>
				<component :is="props.icon" :size="20" />
				{{ props.label }}
			</Button>
		</template>
		<template #content>
			<Transition name="slide-fade">
				<div
					v-if="selectedFilename"
					class="text-xs font-medium text-gray-700 pl-4 border border-t-0 rounded-xl -mt-4 pt-6 pb-2 transition-all"
					:class="props.invalid ? 'border-red-400' : 'border-primary'"
				>
					{{ selectedFilename }}
				</div>
			</Transition>
		</template>
	</FileUpload>
</template>

<style scoped>
.slide-fade-enter-from,
.slide-fade-leave-to {
	transform: translateY(-12px);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
	transition: all 0.4s ease;
}
</style>
