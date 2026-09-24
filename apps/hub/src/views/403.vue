<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { useUserStore } from "@/stores/userStore";
import router from "@/router";
const user = useUserStore();

async function logout() {
	// remove user data + delete session token
	await user.logout();

	// redirect user back for login
	await router.push("/login");
}
</script>

<template>
	<div class="p-3 bg-white text-center">
		<div class="font-semibold text-xl mb-2">Chyba 403</div>
		<div>Pro zobrazení této stránky nemáte dostatečné oprávnění.</div>
		<div>
			Můžete se skusit
			<span @click="logout()" class="underline text-primary cursor-pointer">
				odhlásit
			</span>
			a poté znovu přihlásit nebo kontaktujte podporu.
		</div>
	</div>
</template>
