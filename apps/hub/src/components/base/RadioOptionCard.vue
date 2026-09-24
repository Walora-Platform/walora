<script setup lang="ts">
import { computed } from "vue";
import RadioButton from "primevue/radiobutton";

/* v-model -> what to change */
const model = defineModel<string | number | boolean>({ required: true });

const props = defineProps<{
	value: string | number | boolean; /* set v-model to this value */
	name: string; /* radio inputs with the same name will become a group */
	title: string;
	description?: string;
	disabled?: boolean;
}>();

const isSelected = computed(() => model.value === props.value);

/* create inputId from name + value */
const inputId = props.name + "-" + String(props.value);
</script>

<template>
	<label
		:for="inputId"
		class="flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors"
		:class="[
			disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
			isSelected
				? 'border-primary bg-primary/5'
				: 'border-slate-200 hover:border-slate-300',
		]"
	>
		<RadioButton
			v-model="model"
			:inputId="inputId"
			:name="name"
			:value="value"
			class="mt-0.5 shrink-0"
		/>
		<div>
			<div class="text-sm font-medium text-slate-900">
				{{ title }}
			</div>
			<div class="text-xs text-slate-500">
				{{ description }}
			</div>

			<!-- default slot -->
			<slot></slot>
		</div>
	</label>
</template>
