<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->
<script setup lang="ts">
import { onMounted, reactive, ref, watch, computed } from "vue";
import { formatDate } from "@/utils/formatString";
import api from "@/api/base";

import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Checkbox from "primevue/checkbox";

import {
	IconUserMinus,
	IconUserCog,
	IconMinus,
	IconUserEdit,
	IconUserPlus,
} from "@tabler/icons-vue";

import { showToast } from "@/services/toast";
import { useConfirm } from "primevue/useconfirm";
const confirmDelete = useConfirm();

const users = ref(null);
const roles = ref(null);
const rolesOptions = ref([]);
const customerCompanies = ref();

const selectedUser = ref(null);
const editSelectedUserPermissions = ref(null);

watch(selectedUser, () => {
	if (!selectedUser.value) editSelectedUserPermissions.value = null;
});

const initEditPermissions = () => {
	editSelectedUserPermissions.value = {
		...selectedUser.value?.permissions,
	};
};

const newUser = reactive({
	username: null,
	email: null,
	firstName: null,
	lastName: null,
	role: null,
	customerCompany: null,
	password: null,
});

const emptyUser = {
	username: null,
	email: null,
	firstName: null,
	lastName: null,
	role: null,
	customerCompany: null,
	password: null,
};

const getUsers = async () => {
	const res = await api.get("/users");
	const data = res?.data;

	if (data) {
		users.value = data.users;
		customerCompanies.value = data.customers;
		setRolesOptions(data.roles);

		// find the selected user in fetched users
		selectedUser.value =
			users.value.find((u) => u.id === selectedUser.value?.id) ?? null;
	}
};

const setRolesOptions = (roles) => {
	if (roles) for (const role in roles) rolesOptions.value.push(role);
};

const addUser = async () => {
	const res = await api.post("/users", newUser);
	if (res?.status === 200) {
		Object.assign(newUser, emptyUser);
		await getUsers();
	}
};

const deleteUser = async (id) => {
	if (!id) return;

	const res = await api.delete(`/users/${id}`);
	if (res?.status === 200) {
		await getUsers();
	}
};

const updateSelectedUserPermissions = async () => {
	if (!selectedUser.value) return;

	// only permissions to SET (with checkbox on true)
	const permissonsToSet = Object.entries(editSelectedUserPermissions.value)
		.filter((value) => {
			if (value[1] === true) return value; // ['PERM_KEY', boolean] -> check if its true and based on that filter the array
		})
		.map(([key]) => key); // sanitazies array to only contain 'PERM_KEY' without the true boolean value

	const res = await api.patch(
		`/users/${selectedUser.value.id}/permissions`,
		permissonsToSet,
	);

	if (res?.status === 200) {
		showToast({
			severity: "success",
			summary: "Úprava oprávnění úspěšná",
			detail: `Změnili jste oprávnění uživatelovi ${selectedUser.value?.username}`,
			life: 4000,
		});
	}
	await getUsers();
};

// flag for actions disable (UX)
const didEdit = computed(() => {
	const original = selectedUser.value?.permissions ?? {};
	const edited = editSelectedUserPermissions.value ?? {};

	// all keys
	const keys = new Set([...Object.keys(original), ...Object.keys(edited)]);

	for (const key of keys) {
		if (original[key] !== edited[key]) return true;
	}

	return false;
});

const getCheckboxPt = (key: string) => {
	let state;
	const pt = { box: { class: "" }, icon: { class: "" } };

	const isOriginallyChecked = (key: string) => {
		return !!selectedUser.value?.permissions[key];
	};

	const isCurrentlyChecked = (key: string) => {
		return !!editSelectedUserPermissions.value[key];
	};

	const isChanged = (key: string) => {
		return isOriginallyChecked(key) !== isCurrentlyChecked(key);
	};

	if (!isChanged(key) && isCurrentlyChecked(key)) state = "original";
	else if (isChanged(key) && isCurrentlyChecked(key)) state = "added";
	else if (isChanged(key) && !isCurrentlyChecked(key)) state = "removed";

	switch (state) {
		case "original":
			pt.box.class = "bg-blue-50 border-blue-200";
			pt.icon.class = "text-primary";
			break;

		case "added":
			pt.box.class = "bg-primary border-primary";
			break;

		case "removed":
			pt.box.class = "bg-red-50 border-red-400";
			break;

		default:
			return;
	}

	return pt;
};

/* CONTEXT MENU */
const menuConfig = [
	{
		label: "Upravit údaje",
		tablerIcon: IconUserEdit,
	},
	{
		label: "Upravit oprávnění",
		command: () => initEditPermissions(),
		tablerIcon: IconUserCog,
	},
	{ separator: true },
	{
		label: "Smazat účet",
		command: () => confirmDeleteSelectedUser(),
		tablerIcon: IconUserMinus,
		deleteColor: true,
	},
];

const contextMenu = ref();

const onContextMenu = (event) => {
	const rightClickedUser = event.data;
	if (selectedUser.value !== rightClickedUser) {
		selectedUser.value = rightClickedUser;
		editSelectedUserPermissions.value = null;
	}

	contextMenu.value.openMenu(event.originalEvent);
};

/* confirm delete user */
const confirmDeleteSelectedUser = () => {
	confirmDelete.require({
		header: "Odstranit uživatele",
		message: `Chystáte se smazat účet "${selectedUser.value.username}" osoby s jménem ${selectedUser.value.firstName} ${selectedUser.value.lastName}. Jste si jistí?`,
		acceptLabel: "Ano, smazat!",
		rejectLabel: "Ne, ponechát.",
		accept: () => {
			deleteUser(selectedUser.value?.id);
		},
	});
};

const closeEditPermissions = () => {
	editSelectedUserPermissions.value = null;
	selectedUser.value = null;
};

onMounted(async () => {
	await getUsers();
});
</script>
<template>
	<!-- MAIN CONTENT -->
	<Card class="w-full flex flex-col">
		<CardHeader title="Uživatelé" />
		<!-- ADD USER -->
		<div class="flex mb-6 items-center">
			<InputText
				v-model="newUser.username"
				placeholder="Název účtu"
				id="g4pl_user_create_username"
				inputmode="text"
				fluid
				maxLength="100"
				size="small"
			/>
			<InputText
				v-model="newUser.email"
				placeholder="Email"
				id="g4pl_user_create_email"
				inputmode="text"
				fluid
				maxLength="100"
				size="small"
			/>

			<InputText
				v-model="newUser.firstName"
				placeholder="Jméno"
				id="g4pl_user_create_first_name"
				inputmode="text"
				fluid
				maxLength="100"
				size="small"
			/>
			<InputText
				v-model="newUser.lastName"
				placeholder="Příjmění"
				id="g4pl_user_create_last_name"
				inputmode="text"
				fluid
				maxLength="100"
				size="small"
			/>
			<InputText
				v-model="newUser.password"
				placeholder="Dočasné heslo"
				id="g4pl_user_create_password"
				inputmode="text"
				fluid
				maxLength="100"
				size="small"
				autocomplete="none"
			/>
			<Select
				v-model="newUser.role"
				showClear
				:options="rolesOptions"
				placeholder="Role"
				:pt="{
					root: 'rounded-2xl text-xs py-[2.55px] w-50',
					label: 'text-xs font-medium',
				}"
			/>

			<Select
				v-model="newUser.customerCompany"
				showClear
				:options="customerCompanies"
				optionLabel="code"
				placeholder="Zákazník"
				:pt="{
					root: 'rounded-2xl text-xs py-[2.55px] w-50',
					label: 'text-xs font-medium',
				}"
			/>

			<Button @click="addUser">
				<IconUserPlus size="16" />
				Vytvořit
			</Button>
		</div>

		<Table
			:value="users ?? []"
			v-model:selection="selectedUser"
			@contextMenu="onContextMenu"
			class="h-full"
			onlyShow
		>
			<Column header="Zákazník">
				<template #body="{ data }">
					{{ data.customerCompany?.code }}
				</template>
			</Column>
			<Column field="username" header="Název účtu" />
			<Column field="email" header="Email" />
			<Column field="firstName" header="Jméno" />
			<Column field="lastName" header="Příjmení" />
			<Column header="Role">
				<template #body="{ data }">{{ data.role }}</template>
			</Column>
			<Column header="Vytvořen">
				<template #body="{ data }">
					{{ formatDate(data.createdAt).date }}
					<SubText>
						{{ formatDate(data.createdAt).time }}
					</SubText>
				</template>
			</Column>
		</Table>
		<ContextMenu ref="contextMenu" :items="menuConfig" />
	</Card>

	<!-- SIDE CONTENT -->
	<CardTransitionWrapper>
		<Card
			v-if="editSelectedUserPermissions"
			class="w-70 min-w-70 wrap-anywhere flex flex-col"
			noPadding
		>
			<!-- permissions checkboxes -->
			<div class="card-p scroll-smooth h-full overflow-y-auto min-h-0">
				<CardHeader title="Nastavení oprávnění">
					<div
						@click="closeEditPermissions"
						class="rounded-md px-1 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
					>
						<IconMinus size="16" />
					</div>
				</CardHeader>
				<div
					v-for="(value, key) in editSelectedUserPermissions"
					:key="key"
					class="flex gap-1.5 items-center"
				>
					<Checkbox
						v-model="editSelectedUserPermissions[key]"
						binary
						:pt="getCheckboxPt(key)"
					/>
					<label>{{ key }}</label>
				</div>
			</div>

			<!-- cancel & save buttons -->
			<CardBottomActions>
				<Button
					variant="ghost"
					@click="initEditPermissions"
					:disabled="!didEdit"
				>
					Zrušit
				</Button>
				<Button
					class="flex-1"
					@click="updateSelectedUserPermissions"
					:disabled="!didEdit"
				>
					Uložit
				</Button>
			</CardBottomActions>
		</Card>
	</CardTransitionWrapper>
</template>
