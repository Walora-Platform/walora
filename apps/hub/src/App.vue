<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { useToast } from "primevue/usetoast";
import { setToastService } from "@/services/toast";

// register toast service, so the whole app can use it via showToast() from
const toast = useToast();
setToastService(toast);
</script>

<template>
	<div class="h-screen flex justify-center">
		<!-- bigger than lg -->
		<div class="w-full hidden lg:block">
			<!-- views managed by router -->
			<RouterView />

			<!-- Toast component to show a toast message, single point of component registration, just call showToast() -->
			<Toast />

			<!-- ConfirmDialog component to show a confirmation modal -->
			<ConfirmDialog />
		</div>

		<!-- less than lg -->
		<div class="lg:hidden">
			<h1 class="text-xl font-semibold mb-2">
				Aplikace zatím neni dostupná na mobilních zařízeních
			</h1>
			<p class="text-gray-600">
				Prosím použite notebook nebo počítač s monitorem.
			</p>
		</div>
	</div>
</template>
