<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref } from "vue";
import { IconPencil, IconX, IconCheck } from "@tabler/icons-vue";

withDefaults(
	defineProps<{
		canSave?: boolean;
		editText?: string;
		cancelText?: string;
		saveText?: string;
	}>(),
	{
		canSave: true,
	},
);

const emit = defineEmits<{
	edit: [];
	cancel: [];
	save: [];
}>();

// to close edit mode after edit is successful:
//		1: const editCard = ref();
// 		2: ref="editCard" <- on this component
// 		3: editCard.value.closeEditMode()
defineExpose({ closeEditMode });

function closeEditMode() {
	isEditing.value = false;
}

const isEditing = ref(false);

function onEdit() {
	isEditing.value = true;
	emit("edit");
}

function onCancel() {
	closeEditMode();
	emit("cancel");
}

function onSave() {
	emit("save");
}
</script>

<template>
	<section class="relative rounded-2xl border border-slate-200 bg-white p-4">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
			<!-- put EditableField components here -->
			<slot :isEditing="isEditing" />
		</div>

		<!-- card actions -->
		<div
			class="absolute -right-2 -top-2 rounded-xl bg-white outline-6 outline-white"
		>
			<!-- EDIT BUTTON -->
			<button
				v-if="!isEditing"
				@click="onEdit"
				class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary cursor-pointer"
			>
				<IconPencil size="14" />
				{{ editText ?? "Upravit" }}
			</button>

			<!-- CANCEL AND SAVE BUTTONS -->
			<div v-else class="flex items-center gap-1">
				<!-- cancel -->
				<button
					@click="onCancel"
					class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 cursor-pointer"
				>
					<IconX size="14" />
					{{ cancelText ?? "Zrušit" }}
				</button>

				<!-- save -->
				<button
					@click="onSave"
					:disabled="!canSave"
					:class="[
						'flex items-center gap-1.5  rounded-xl px-3 py-1.5 text-xs font-medium transition',
						canSave
							? 'bg-primary text-white hover:bg-primary/90 cursor-pointer'
							: 'bg-slate-100 text-slate-300 cursor-not-allowed',
					]"
				>
					<IconCheck size="14" />
					{{ saveText ?? "Uložit" }}
				</button>
			</div>
		</div>
	</section>
</template>
