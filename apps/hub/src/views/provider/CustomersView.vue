<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed, provide } from "vue";
import api from "@/api/base";
import { formatDate, timeAgo } from "@/utils/formatString";

import Column from "primevue/column";
import Divider from "primevue/divider";
import ToggleSwitch from "primevue/toggleswitch";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import { useConfirm } from "primevue/useconfirm";

import {
	IconTrash,
	IconPower,
	IconApi,
	IconUsersPlus,
	IconKey,
	IconX,
	IconUserSearch,
	IconEdit,
	IconPackage,
} from "@tabler/icons-vue";
import { showToast } from "@/services/toast";

const confirm = useConfirm();

const customers = ref<object[]>([]);
const totalRecords = ref(0);
const pageSizeOptions = [20, 40, 60];

const query = reactive({
	page: 0,
	pageSize: pageSizeOptions[0],
});

const contextMenu = ref();
const onContextMenu = (event) =>
	contextMenu.value.openMenu(event.originalEvent);

const selectedCustomer = ref<string | null>(null);
const contextMenuSelection = ref(null);

const generatedApiKey = ref<string | null>(null);
const generatedApiKeyCountdown = ref<number | null>(null);
let countdownInterval: ReturnType<typeof setInterval> | null = null;

const addCustomerCompanyMode = ref(false);

onMounted(() => fetchCustomers(query));

const menuConfig = [
	{
		label: "Zobrazit detail",
		tablerIcon: IconUserSearch,
		command: () => openCustomerProfile(),
	},
	{ separator: true },
	{
		label: "Smazat",
		deleteColor: true,
		tablerIcon: IconTrash,
		command: () => confirmDeleteCustomerCompany(),
	},
];

const fetchCustomerProfile = async (id: string) => {
	const c = await api.get(`/customers/${id}`);
	if (c?.status === 200) selectedCustomer.value = c.data;
};

const fetchSelectedCustomerProfile = async () => {
	fetchCustomerProfile(selectedCustomer.value.id);
};

const openCustomerProfile = async () => {
	const id = contextMenuSelection.value.id;
	await fetchCustomerProfile(id);

	await initBillingSettings();

	contextMenuSelection.value = null; // reset after selection
	if (addCustomerCompanyMode.value) addModeToggle();
};
const closeCustomerProfile = () => {
	selectedCustomer.value = null;
	fetchCustomers();
};

async function fetchCustomers() {
	const res = await api.get("/customers", { params: query });
	if (res?.data) {
		customers.value = res.data.data;
		totalRecords.value = res.data.total;
	}
}

async function fetchCustomersPage({ page, pageSize }) {
	query.page = page;
	query.pageSize = pageSize;
	await fetchCustomers();
}

const onPageChange = (pageObject) => {
	fetchCustomersPage(pageObject);
};

async function generateApiKeyFor(customerId) {
	if (!customerId) return;
	const res = await api.post(`/customers/${customerId}/api-key`);

	if (res?.data) {
		startApiKeyCountdown(res.data.key);
		await fetchSelectedCustomerProfile();
	}
}

function startApiKeyCountdown(apiKey: string) {
	generatedApiKey.value = apiKey;
	generatedApiKeyCountdown.value = 10;

	if (countdownInterval) clearInterval(countdownInterval);

	// 1 sec interval that will be repeated until countdown hits 0
	countdownInterval = setInterval(() => {
		if (generatedApiKeyCountdown.value === null) return;

		generatedApiKeyCountdown.value--;

		if (generatedApiKeyCountdown.value === 0) {
			generatedApiKey.value = null;
			generatedApiKeyCountdown.value = null;

			clearInterval(countdownInterval);
			countdownInterval = null;
		}
	}, 1000);
}

async function deleteApiKey(id) {
	await api.patch(`/customers/api-key/${id}`, {
		action: "delete",
	});
	await fetchSelectedCustomerProfile();
}

function confirmApiKeyDelete(id, prefix, lastUsedAt) {
	confirm.require({
		header: "Vymazat API klíč",
		message: `Chystáte se smazat API klíč s prefixem '${prefix}' zákazníka ${selectedCustomer.value.code}. ${lastUsedAt ? `Naposledy byl použit ${timeAgo(lastUsedAt)}.` : ""} Jste si jistí?`,
		acceptLabel: "Ano, smazat!",
		rejectLabel: "Ne, ponechát.",
		accept: () => {
			deleteApiKey(id);
		},
	});
}

async function setActiveStateForApiKeyTo(id, isActive) {
	await api.patch(`/customers/api-key/${id}`, {
		action: "setActive",
		isActive: isActive,
	});
	await fetchSelectedCustomerProfile();
}

// new customer company object
const ncc = reactive({
	name: undefined,
	code: undefined,
	codeError: undefined,
});

const emptyNcc = {
	name: undefined,
	code: undefined,
	codeError: undefined,
};

const addNewDisabled = ref(true);

const codeModel = computed({
	get: () => ncc.code,
	set: (value: string) => {
		ncc.code = value
			.replace(/[^a-zA-Z]/g, "")
			.toUpperCase()
			.slice(0, 5);

		if (isCodeFormatValid(ncc.code)) ncc.codeError = undefined;
	},
});

watch(ncc, () => {
	if (ncc.name && ncc.code && !ncc.codeError) addNewDisabled.value = false;
	else addNewDisabled.value = true;
});

const isCodeFormatValid = (code) => /^[A-Z]{3,5}$/.test(code);

const addNewCustomerCompany = async () => {
	if (!ncc.name || !ncc.code) return;

	if (!isCodeFormatValid(ncc.code)) {
		ncc.codeError = "Zkratka musí mít formát 3-5 velkých písmen";
		return;
	}

	const res = await api.post("/customers", { name: ncc.name, code: ncc.code });

	// handle successs toast
	if (res?.status === 200) {
		showToast({
			severity: "success",
			summary: "Zákazník byl úspěšně vytvořen",
			life: 4000,
		});

		addModeToggle();
		Object.assign(ncc, emptyNcc); // reset ncc
		await fetchCustomers();
	}
};

const addModeToggle = () =>
	(addCustomerCompanyMode.value = !addCustomerCompanyMode.value);

/* BILLING SETTINGS */
interface BillingSettings {
	mode: "NONE" | "MONTHLY_DAY" | "MONTH_END" | "AFTER_EACH";
	billingDayOfMonth?: number;
}

const billingSettings: BillingSettings = reactive({
	mode: "NONE",
	billingDayOfMonth: undefined,
});

const originalBillingSettings: BillingSettings = reactive({
	mode: "NONE",
	billingDayOfMonth: undefined,
});

const initBillingSettings = () => {
	billingSettings.mode = selectedCustomer.value.billingMode;
	billingSettings.billingDayOfMonth = selectedCustomer.value.billingDayOfMonth;

	setNewBaseForBillingSettings();
};

const setNewBaseForBillingSettings = () => {
	Object.assign(originalBillingSettings, billingSettings);
};

const resetBillingSettings = () => {
	Object.assign(billingSettings, originalBillingSettings);
};

const hasBillingSettingsChanges = computed(() => {
	return (
		billingSettings.mode !== originalBillingSettings.mode ||
		billingSettings.billingDayOfMonth !==
			originalBillingSettings.billingDayOfMonth
	);
});

const billingSettingsError = computed(() => {
	if (
		billingSettings.mode === "MONTHLY_DAY" &&
		(!billingSettings.billingDayOfMonth ||
			billingSettings.billingDayOfMonth < 1 ||
			billingSettings.billingDayOfMonth > 15)
	) {
		return "Nastavte fakturační interval v rozsahu 1 až 15 dní.";
	}
	return null;
});

const canSaveBillingSettings = computed(() => {
	return hasBillingSettingsChanges.value && !billingSettingsError.value;
});

async function saveBillingSettings() {
	if (!canSaveBillingSettings.value) return;
	const payload = {
		billingMode: billingSettings.mode,
		billingDayOfMonth:
			billingSettings.mode === "MONTHLY_DAY"
				? billingSettings.billingDayOfMonth
				: null,
	};
	const id = selectedCustomer.value.id;
	const res = await api.patch(`/customers/${id}/billing-settings`, payload);

	if (res?.status === 200) {
		showToast({
			severity: "success",
			summary: "Nastavení fakturace uloženo",
			life: 4000,
		});
		await fetchSelectedCustomerProfile();
		setNewBaseForBillingSettings();
	}
}

const showBillingOptions = computed({
	get: () => billingSettings.mode !== "NONE",
	set: (enabled: boolean) => {
		billingSettings.mode = enabled ? "MONTH_END" : "NONE";
	},
});

/* TABS VALUE */
type CustomerTabs = "general" | "billing" | "API";
const activeCustomerTab = ref<CustomerTabs>("general");

/* PROFILE ACTIONS */
type CardActionConfig = {
	show: boolean;
	onPrimary: () => void | Promise<void>;
	onSecondary: () => void;
	primaryDisabled?: boolean;
};

const cardActions = computed<CardActionConfig | null>(() => {
	switch (activeCustomerTab.value) {
		case "general": {
			if (!isEditing.value) break;

			return {
				show: true,
				onPrimary: saveSelectedCustomerEdit,
				onSecondary: closeEdit,
				primaryDisabled: !canSaveEdit.value,
			};
		}

		case "billing": {
			if (!hasBillingSettingsChanges.value) break;

			return {
				show: true,
				onPrimary: saveBillingSettings,
				onSecondary: resetBillingSettings,
				primaryDisabled: !canSaveBillingSettings.value,
			};
		}
	}

	return null;
});

/* EDIT */
const edit = reactive(emptyNcc);
const isEditing = ref(false);
const editCard = ref();

const editCodeModel = computed({
	get: () => edit.code,
	set: (value: string) => {
		edit.code = value
			.replace(/[^a-zA-Z]/g, "")
			.toUpperCase()
			.slice(0, 5);

		if (isCodeFormatValid(edit.code)) edit.codeError = undefined;
	},
});

const onEdit = () => {
	edit.name = selectedCustomer.value.name;
	edit.code = selectedCustomer.value.code;
};

async function saveSelectedCustomerEdit() {
	if (!edit.name || !edit.code) return;

	if (!isCodeFormatValid(edit.code)) {
		edit.codeError = "Zkratka musí mít formát 3-5 velkých písmen";
		return;
	}

	const id = selectedCustomer.value.id;
	const res = await api.patch(`/customers/${id}`, {
		name: edit.name,
		code: edit.code,
	});

	// handle successs toast
	if (res?.status === 200) {
		showToast({
			severity: "success",
			summary: "Zákazník byl úspěšně upraven",
			life: 4000,
		});

		editCard.value.closeEditMode();
		await fetchSelectedCustomerProfile();
	}
}

const editHasChanges = computed(() => {
	return (
		edit.name !== selectedCustomer.value.name ||
		edit.code !== selectedCustomer.value.code
	);
});

const canSaveEdit = computed(() => {
	return editHasChanges.value && !edit.codeError && edit.name && edit.code;
});

/* DELETE */
const deleteCustomerCompany = async (id) => {
	const res = await api.delete(`/customers/${id}`);

	if (res?.status === 200) {
		showToast({
			severity: "success",
			summary: "Zákazník úspěšně smazán",
			life: 4000,
		});

		await fetchCustomers();
	}
};

const confirmDeleteCustomerCompany = () => {
	const { id, code, name } = contextMenuSelection.value;

	confirm.require({
		header: "Vymazat zákazníka",
		message: `Chystáte se smazat zákazníka ${name} (${code}). Jste si jistí?`,
		acceptLabel: "Ano, smazat!",
		rejectLabel: "Ne, ponechát.",
		accept: () => {
			deleteCustomerCompany(id);
		},
	});
};

provide("fieldWidth", "48");
</script>

<template>
	<CardTransitionWrapper class="w-full">
		<!-- customer profile -->
		<Card
			v-if="selectedCustomer"
			:innerDivClass="{ 'pb-0!': activeCustomerTab === 'billing' }"
			scrollable
		>
			<ProfileHeader
				:title="selectedCustomer?.name"
				:subtitle="selectedCustomer?.code"
			>
				<Button @click="closeCustomerProfile" variant="outlined">
					<IconX size="16" />
				</Button>
			</ProfileHeader>

			<!-- form actions -->
			<template #bottomActions>
				<CardActions
					v-if="cardActions?.show"
					variant="edit"
					primaryText="Uložit"
					secondaryText="Zrušit změny"
					:onPrimary="cardActions?.onPrimary"
					:onSecondary="cardActions?.onSecondary"
					primaryBtnNotFluid
					class="transition-all"
					:disabled="cardActions?.primaryDisabled"
				/>
			</template>

			<!-- KPI CARDS -->
			<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
				<SmallCardKPI title="Zásilky dnes" :icon="IconPackage" />
				<SmallCardKPI title="Zásilky za posledních 7d" :icon="IconPackage" />
				<SmallCardKPI title="Zásilky od začátku roku" :icon="IconPackage" />
			</div>

			<!-- TABS PROFILE NAVIATION -->
			<Tabs
				v-model:value="activeCustomerTab"
				class="flex flex-col flex-1 min-h-0 g-scrollbar"
			>
				<TabList class="text-[13px]">
					<Tab value="general">Všeobecné informace</Tab>
					<Tab value="billing">Fakturace</Tab>
					<Tab value="API">API přístup</Tab>
				</TabList>
				<TabPanels class="px-0 pb-0 flex-1 min-h-0">
					<!-- COMMON INFORMATION -->
					<TabPanel value="general" class="flex flex-col gap-6 items-start">
						<div class="w-3xl">
							<EditableSectionCard
								ref="editCard"
								@edit="onEdit"
								@save="saveSelectedCustomerEdit"
								:canSave="canSaveEdit"
							>
								<template #default="{ isEditing }">
									<!-- NAME -->
									<EditableField label="Název firmy" :editing="isEditing">
										<template #default>
											<span class="font-medium">
												{{ selectedCustomer?.name ?? "-" }}
											</span>
										</template>

										<template #edit>
											<InputText
												v-model="edit.name"
												inputmode="text"
												maxlength="50"
												size="small"
												fluid
											/>
										</template>
									</EditableField>

									<EditableField label="Kód zákazníka" :editing="isEditing">
										<template #default>
											<span class="font-medium">
												{{ selectedCustomer?.code ?? "-" }}
											</span>
										</template>

										<template #edit>
											<InputText
												v-model="editCodeModel"
												inputmode="text"
												maxlength="5"
												size="small"
												fluid
											/>
											<ErrorMessage>{{ edit.codeError }}</ErrorMessage>
										</template>
									</EditableField>
								</template>
							</EditableSectionCard>
						</div>
					</TabPanel>

					<!-- BILLING SETTINGS -->
					<TabPanel value="billing" class="h-full overflow-y-auto">
						<!-- <div class="text-base font-medium mb-3 text-black">Nastavení</div> -->

						<div class="max-w-2xl space-y-3">
							<!-- enable automatic billing -->
							<div
								class="flex items-start justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
							>
								<div>
									<div class="text-sm font-medium text-slate-900">
										Automatická fakturace
									</div>
									<div class="text-xs text-slate-500">
										Systém bude automaticky generovat podklady pro fakturaci
										zásilek tohoto zákazníka.
									</div>
								</div>
								<ToggleSwitch
									v-model="showBillingOptions"
									class="shrink-0 scale-85"
								/>
							</div>

							<!-- automatic billing options -->
							<div v-if="showBillingOptions" class="space-y-2 mb-2">
								<!-- options header -->
								<div class="mb-3">
									<div class="text-sm font-medium text-slate-900">
										Režim fakturace
									</div>
									<div class="text-xs text-slate-500">
										Vyberte, kdy se mají vytvářet fakturační podklady
									</div>
								</div>

								<!-- MONTH_END -->
								<RadioOptionCard
									v-model="billingSettings.mode"
									name="billingMode"
									value="MONTH_END"
									title="Na konci měsíce"
									description="Podklady se vytvoří první den následujícího měsíce"
								/>

								<!-- MONTHLY_DAY -->
								<RadioOptionCard
									v-model="billingSettings.mode"
									name="billingMode"
									value="MONTHLY_DAY"
									title="Pravidelně v měsíci"
									description="Podklady se vytvoří vždy po skončení fakturačního období"
								>
									<div
										v-if="billingSettings.mode === 'MONTHLY_DAY'"
										class="mt-3 flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
									>
										<span class="text-xs text-slate-700">
											Fakturační interval:
										</span>
										<InputNumber
											v-model="billingSettings.billingDayOfMonth"
											:min="1"
											:max="15"
											:useGrouping="false"
											size="small"
											inputClass="w-14 text-sm text-center"
										/>
										<span class="text-xs text-slate-700">dní</span>
									</div>
									<ErrorMessage v-if="billingSettingsError" class="mt-2">
										{{ billingSettingsError }}
									</ErrorMessage>
								</RadioOptionCard>

								<!-- AFTER_EACH -->
								<RadioOptionCard
									v-model="billingSettings.mode"
									name="billingMode"
									value="AFTER_EACH"
									title="Po každé zásilce"
									description="Podklad se vytvoří po doručení jednotlivé zásilky"
								/>
							</div>
						</div>
					</TabPanel>

					<!-- COMPANY USERS -->
					<TabPanel value="users"></TabPanel>

					<!-- API KEYS MANAGEMENT -->
					<TabPanel
						value="API"
						class="flex flex-col gap-3 min-h-0 flex-1 h-full items-start"
					>
						<div class="flex items-center">
							<Button @click="generateApiKeyFor(selectedCustomer?.id)">
								<IconKey size="16" />
								Vytvořit API klíč
							</Button>

							<!-- ENERATED API KEY -->
							<div v-if="generatedApiKey" class="ml-4 flex flex-col text-sm">
								<div>
									Klíč bude schován za
									{{ generatedApiKeyCountdown }} sekund, uložte si ho
								</div>
								<span class="font-medium">{{ generatedApiKey }}</span>
							</div>
						</div>

						<div class="flex flex-1 min-h-0 w-full overflow-hidden">
							<Table
								:value="selectedCustomer?.apiKeys ?? []"
								onlyShow
								class="w-full h-full"
							>
								<Column header="Prefix klíče">
									<template #body="{ data }">
										<span class="font-medium">{{ data.prefix }}</span>
									</template>
								</Column>
								<Column header="Vytvořen">
									<template #body="{ data }">
										{{ data.createdAt.date }}
										<SubText>
											{{ data.createdAt.time }}
										</SubText>
									</template>
								</Column>
								<Column header="Naposledy použit">
									<template #body="{ data }">
										<div v-if="data.lastUsedAt">
											{{ data.lastUsedAt.date }}
											<SubText class="mr-1">
												{{ data.lastUsedAt.time }}
											</SubText>
											<span v-if="data.lastUsedAt.raw">
												({{ timeAgo(data.lastUsedAt.raw) }})
											</span>
										</div>
									</template>
								</Column>
								<Column header="Stav">
									<template #body="{ data }">
										<ToggleSwitch
											v-model="data.active"
											@change="setActiveStateForApiKeyTo(data.id, data.active)"
											class="flex"
										/>
									</template>
								</Column>
								<Column>
									<template #body="{ data }">
										<Tag
											@click="
												confirmApiKeyDelete(
													data.id,
													data.keyPrefix,
													data.lastUsedAt,
												)
											"
											variant="INACTIVE"
											class="w-10 h-6 justify-center cursor-pointer"
										>
											<IconTrash size="16" />
										</Tag>
									</template>
								</Column>
							</Table>
						</div>
					</TabPanel>
				</TabPanels>
			</Tabs>
		</Card>

		<!-- customers table -->
		<Card v-else>
			<CardHeader
				title="Seznam zákazníků"
				subtitle="Zde můžete spravovat své zákazníky"
			>
				<Button @click="addModeToggle">
					<IconUsersPlus size="16" />
					Přidat zákazníka
				</Button>
			</CardHeader>

			<Table
				:value="customers"
				:totalRecords="totalRecords"
				:rowsPerPageOptions="pageSizeOptions"
				v-model:contextMenuSelection="contextMenuSelection"
				@pageChange="onPageChange"
				@contextMenu="onContextMenu"
				contextMenuSelectionMode
				stateKey="g4pl-customers"
				paginator
				onlyShow
			>
				<ContextMenu
					ref="contextMenu"
					@hide="contextMenuSelection = null"
					:items="menuConfig"
				/>
				<Column header="Kód">
					<template #body="{ data }">
						<span class="font-medium">{{ data.code }}</span>
					</template>
				</Column>
				<Column header="Název firmy">
					<template #body="{ data }">
						<span>{{ data.name }}</span>
					</template>
				</Column>
				<Column header="Vytvořen">
					<template #body="{ data }">
						{{ data.createdAt.date }}
						<SubText>
							{{ data.createdAt.time }}
						</SubText>
					</template>
				</Column>
				<Column header="Počet účtů">
					<template #body="{ data }">
						<span v-if="data.count.users">{{ data.count.users }}</span>
					</template>
				</Column>
				<Column header="API přístup">
					<template #body="{ data }">
						<!-- active api keys count -->
						<Tag
							v-if="data.count.activeApiKeys !== 0"
							:label="`Aktivní  (${data.count.activeApiKeys})`"
							variant="ACTIVE"
						/>
					</template>
				</Column>
				<Column header="Aktuálně platný tarif">
					<template #body="{ data }">
						<Tag
							v-if="data.activeTariff"
							:label="`${data.activeTariff.name} (do ${data.activeTariff.validTo ?? 'neuvedeno'})`"
							variant="LOADED"
						/>
					</template>
				</Column>
			</Table>
		</Card>
	</CardTransitionWrapper>

	<CardTransitionWrapper class="text-sm">
		<!-- ADD CUSTOMER FORM -->
		<Card v-if="addCustomerCompanyMode" class="w-85" scrollable>
			<CardHeader title="Nový zákazník" subtitle="Vyplňte všechny políčka" />

			<Form>
				<!-- NAME -->
				<FormField title="Název">
					<InputText
						id="g4pl_ncc_name"
						v-model="ncc.name"
						inputmode="text"
						size="small"
						fluid
						maxlength="50"
					/>
				</FormField>

				<!-- CODE -->
				<FormField
					title="Zkratka"
					subtitle="3-5 velkých písmen"
					:errorMsg="ncc.codeError"
				>
					<InputText
						id="g4pl_ncc_code"
						v-model="codeModel"
						inputmode="text"
						size="small"
						fluid
						maxlength="5"
					/>
				</FormField>
			</Form>

			<template #bottomActions>
				<CardActions
					variant="create"
					:onPrimary="addNewCustomerCompany"
					:onSecondary="addModeToggle"
					:disabled="addNewDisabled"
					:loading="false"
				/>
			</template>
		</Card>
	</CardTransitionWrapper>
</template>
