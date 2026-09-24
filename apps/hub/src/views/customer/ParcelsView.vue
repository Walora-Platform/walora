<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref } from "vue";
import GBaseParcelsView from "@/views/BaseParcelsView.vue";

import Column from "primevue/column";
import { IconFilter } from "@tabler/icons-vue";

const selection = ref([]);
</script>
<template>
	<GBaseParcelsView
		mode="customer"
		v-model:selection="selection"
		stateKey="g4pl-customer-parcels"
	>
		<template #columnsStart="{ parcelStatus }">
			<Column
				field="billOfLadingNum"
				header="Číslo DL"
				class="font-medium z-1"
				frozen
			/>
			<Column header="Stav">
				<template #body="{ data }">
					<Tag
						:icon="parcelStatus[data.status].icon"
						:label="parcelStatus[data.status].label"
						:status="data.status"
					/>
				</template>
			</Column>
		</template>
	</GBaseParcelsView>
</template>
