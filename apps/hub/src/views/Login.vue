<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref, watch } from "vue";
import { useUserStore } from "@/stores/userStore";
import { useRoute, useRouter } from "vue-router";
import InputText from "primevue/inputtext";
import FloatLabel from "primevue/floatlabel";
import Password from "primevue/password";

const user = useUserStore();
const route = useRoute();
const router = useRouter();

const name = ref("");
const password = ref("");

const nameMissing = ref<boolean>(false);
const passwordMissing = ref<boolean>(false);
const areBadCredentials = ref<boolean>(false);
const isServerError = ref<boolean>(false);

const submitLogin = async () => {
	nameMissing.value = !name.value.trim();
	passwordMissing.value = !password.value.trim();

	if (nameMissing.value || passwordMissing.value) return;

	const code = { BAD_CREDENTIALS: 0, BACKEND_ERROR: 1, SERVER_ERROR: 500 };

	const { isSuccessful, errCode } = await user.login(
		name.value.trim(),
		password.value.trim(),
	);

	if (!isSuccessful) {
		switch (errCode) {
			case code.BAD_CREDENTIALS:
				areBadCredentials.value = true;
				break;
			case code.BACKEND_ERROR: // backend is running, error happend inside backend
			case code.SERVER_ERROR: // backend is not running
				isServerError.value = true;
				setTimeout(() => {
					isServerError.value = false;
				}, 5500);
				break;
		}
		return;
	}

	// redirect user where he wanted to go based on redirect query
	const redirect = route.query.redirect as string | undefined;
	router.replace(redirect ?? "/");
};

watch(name, () => {
	if (nameMissing.value || areBadCredentials.value) {
		nameMissing.value = false;
		areBadCredentials.value = false;
	}
});

watch(password, () => {
	if (passwordMissing.value || areBadCredentials.value) {
		passwordMissing.value = false;
		areBadCredentials.value = false;
	}
});
</script>

<template>
	<div class="h-screen flex justify-center">
		<div class="w-[450px] flex flex-col mt-[14vh] px-9">
			<!-- login card -->
			<div
				class="relative flex flex-col gap-3.5 bg-white shadow-xl shadow-primary/40 p-8 rounded-2xl rounded-tr-none"
			>
				<!-- inner corner for login card -->
				<!-- <div class="absolute -top-3 right-47 size-3 bg-white" />
				<div
					class="absolute -top-5 right-47 size-5 rounded-full bg-background-gray"
				/> -->

				<!-- system name with company logo -->
				<div
					class="absolute right-0 -top-9 flex gap-2.5 items-baseline bg-white p-3 w-fit rounded-t-2xl"
				>
					<img src="@/assets/G4PL_logo.svg" alt="Global 4PL logo" width="50" />
					<p class="text-xs text-gray-500 italic">Informační systém</p>

					<!-- inner corner (white square with inner background color square with rounded-br-* ") -->
					<div class="absolute bottom-[7.2px] -left-4 size-4 bg-white">
						<div class="absolute inset-0 rounded-br-2xl bg-background-gray" />
					</div>
				</div>

				<CardHeader
					title="Přihlášení"
					subtitle="Zadejte své přihlašovací údaje"
					loginHeader
				/>

				<!-- login form -->
				<div class="flex flex-col gap-1">
					<FloatLabel variant="on" class="text-sm">
						<InputText
							id="g4pl_name"
							type="name"
							v-model="name"
							:invalid="nameMissing"
							fluid
							class="p-3 rounded-xl text-sm"
						/>
						<label for="g4pl_name">Název účtu</label>
					</FloatLabel>
					<ErrorMessage v-if="nameMissing">Toto pole je povinné.</ErrorMessage>
				</div>

				<div class="flex flex-col gap-1">
					<FloatLabel variant="on" class="text-sm">
						<Password
							id="g4pl_password"
							v-model="password"
							@keyup.enter.exact="submitLogin()"
							:invalid="passwordMissing"
							:feedback="false"
							toggleMask
							fluid
							inputClass="p-3 rounded-xl text-sm"
						/>
						<label for="g4pl_password">Heslo</label>
					</FloatLabel>
					<ErrorMessage v-if="passwordMissing">
						Toto pole je povinné.
					</ErrorMessage>
				</div>
				<div class="flex flex-col gap-2 mt-1">
					<Button @click="submitLogin()" scale>Přihlásit se</Button>
					<ErrorMessage v-if="areBadCredentials">
						Nesprávné přihlašovací údaje.
					</ErrorMessage>
					<ErrorMessage v-if="isServerError" :life="5000">
						Omlouváme se, došlo k chybě na straně serveru. Zkuste to znova nebo
						pokud problém přetrvává, kontaktujte správce systému.
					</ErrorMessage>
				</div>
			</div>

			<!-- footer -->
			<div class="h-full flex flex-col justify-end items-center">
				<Footer />
			</div>
		</div>
	</div>
</template>
