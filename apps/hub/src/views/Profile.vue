<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref, provide } from "vue";
import { useUserStore } from "@/stores/userStore";
import { IconEdit } from "@tabler/icons-vue";
import PageIncoming from "./PageIncoming.vue";

const user = useUserStore();

function formatDate(isoString) {
	const d = new Date(isoString);

	const pad = (n) => String(n).padStart(2, "0");

	return {
		date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
		time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
	};
}

provide("fieldWidth", 60); // to set width of field header in FormField
</script>

<template>
	<PageIncoming />
	<!-- <div class="space-y-2 w-full">
		<Card class="pb-4">
			<CardHeader
				title="Obecné informace"
				subtitle="Spravujte své uživatelské údaje"
			>
				<Button scale>
					<IconEdit size="18" />
					Upravit
				</Button>
			</CardHeader>

			<div class="flex w-full gap-12">
				<div class="flex-1">
					<FormField title="Název účtu" compact>
						{{ user.username }}
					</FormField>
					<FormField title="E-mail" compact>{{ user.email }}</FormField>
					<FormField title="Společnost" compact noDivider>
						{{ user.customerCompany?.name }}
					</FormField>
				</div>
				<div class="flex-1">
					<FormField title="Jméno" compact>{{ user.firstName }}</FormField>
					<FormField title="Příjmení" compact>{{ user.lastName }}</FormField>
					<FormField title="Datum založení účtu" compact noDivider>
						{{ formatDate(user.createdAt).date }}
						<span class="text-xs text-gray-500">
							{{ formatDate(user.createdAt).time }}
						</span>
					</FormField>
				</div>
			</div>
		</Card>
		<div class="flex w-full gap-2">
			<Card class="flex-1 pb-4">
				<CardHeader
					title="Změna hesla"
					subtitle="Zadejte své staré heslo a zvolte si nové"
				>
					<Button disabled scale>
						<IconEdit size="18" />
						Uložit
					</Button>
				</CardHeader>
				<FormField title="Staré heslo" compact></FormField>
				<FormField title="Nové heslo" compact></FormField>
				<FormField title="Potvrďte heslo" compact noDivider></FormField>
			</Card>
			<Card class="flex-1">
				<CardHeader
					title="Změna profilové fotky"
					subtitle="Profilovou fotku vidí jiní uživatelé v "
				/>
			</Card>
		</div>
	</div> -->
</template>
