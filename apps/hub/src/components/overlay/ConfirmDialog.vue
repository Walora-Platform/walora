<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup>
import ConfirmDialog from "primevue/confirmdialog";
import { IconAlertTriangleFilled } from "@tabler/icons-vue"; // default icon (specify with confirm.require({ icon: [TABLER_ICON_COMPONENT] }))
</script>

<template>
	<ConfirmDialog>
		<template #container="{ message, acceptCallback, rejectCallback }">
			<div class="flex flex-col gap-4 p-5 items-center max-w-[350px]">
				<!-- ICON -->
				<div class="rounded-full p-3 bg-red-100">
					<component
						:is="message.icon ?? IconAlertTriangleFilled"
						size="30"
						class="text-red-500"
					/>
				</div>

				<!-- HEADER -->
				<h3 class="text-lg font-bold">
					{{ message.header }}
				</h3>

				<!-- MESSAGE -->
				<p class="text-center text-gray-600 text-sm whitespace-pre-wrap">
					{{ message.message }}
				</p>

				<!-- ACTIONS -->
				<div class="flex justify-center gap-2 mt-4">
					<Button @click="rejectCallback" variant="ghost" class="shadow">
						{{ message.rejectLabel ?? "Zrušit" }}
					</Button>

					<Button @click="acceptCallback" variant="danger">
						{{ message.acceptLabel ?? "Potvrdit" }}
					</Button>
				</div>
			</div>
		</template>
	</ConfirmDialog>
</template>
