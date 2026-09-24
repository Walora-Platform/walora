<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import Toast from "primevue/toast";
import {
	IconAlertHexagon,
	IconX,
	IconSquareRoundedCheck,
} from "@tabler/icons-vue";
</script>

<template>
	<!-- toasts can have groups, which can then be individualy designed to better match each usecase -->
	<!-- style a Toast component with attribute group="notification" and then use this group with showToast({ group, severity, defail, life }) -->
	<!-- the object put into showToast({}) will be available as message in the following template  -->
	<Toast position="bottom-right" unstyled>
		<template #container="{ message, closeCallback }">
			<div
				:class="[
					'flex gap-2.5 items-start p-3 rounded-2xl shadow-lg border w-[360px]',
					{
						'bg-red-50 border-red-200 text-red-700':
							message?.severity === 'error',
						'bg-green-50 border-green-200 text-green-600':
							message?.severity === 'success',
					},
				]"
			>
				<!-- ICON -->
				<IconAlertHexagon
					v-if="message?.severity === 'error'"
					size="20"
					class="text-red-600"
				/>
				<IconSquareRoundedCheck
					v-if="message?.severity === 'success'"
					size="20"
					class="text-green-600"
				/>

				<!-- TEXT -->
				<div class="flex-1">
					<div class="text-sm font-semibold">
						{{ message.summary }}
					</div>

					<div class="text-sm mt-0.5">{{ message.detail }}</div>
				</div>

				<!-- CLOSE BUTTON -->
				<IconX
					@click="closeCallback"
					size="16"
					:class="[
						'cursor-pointer transition-colors',
						{
							'text-red-600 hover:text-red-800': message?.severity === 'error',
							'text-green-600 hover:text-green-800':
								message?.severity === 'success',
						},
					]"
				/>
			</div>
		</template>
	</Toast>
</template>

<style>
/* ENTER */
.p-toast-message-enter-from {
	opacity: 0;
	transform: translateY(16px) scale(0.85);
}

.p-toast-message-enter-active {
	transition:
		transform 0.2s cubic-bezier(0.2, 0, 0, 1),
		opacity 0.2s ease;
}

.p-toast-message-enter-to {
	opacity: 1;
	transform: translateY(0) scale(1);
}

/* LEAVE */
.p-toast-message-leave-from {
	opacity: 1;
	transform: translateY(0) scale(1);
}

.p-toast-message-leave-active {
	transition:
		transform 0.15s ease-in,
		opacity 0.15s ease-in;
}

.p-toast-message-leave-to {
	opacity: 0;
	transform: translateY(12px) scale(0.9);
}
</style>
