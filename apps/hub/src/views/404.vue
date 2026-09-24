<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import router from "@/router";
</script>
<template>
	<div class="p-3 bg-white text-center">
		<div class="font-semibold text-xl mb-2">Chyba 404: Stránka nenalezena</div>
		<div>
			Stránka, na kterou směřujete, neexistuje. Můžete jít
			<span
				@click="router.go(-1)"
				class="underline text-primary cursor-pointer"
			>
				zpět
			</span>
			nebo kontaktujte podporu.
		</div>
	</div>
</template>
