<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->
<script setup lang="ts">
import { onMounted, ref, reactive, computed } from "vue";
import { showToast } from "@/services/toast";
import { useConfirm } from "primevue/useconfirm";
import api from "@/api/base";

import Column from "primevue/column";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import {
	IconX,
	IconPlus,
	IconSearch,
	IconTrash,
	IconRoute,
	IconPackage,
	IconAddressBook,
	IconTruckLoading,
	IconPencil,
	IconCheck,
	IconTruck,
} from "@tabler/icons-vue";

const carriers = ref<object[]>([]);
const totalRecords = ref(0);
const pageSizeOptions = [20, 40, 60];

const selectedCarrier = ref(null);

const query = reactive({
	page: 0,
	pageSize: pageSizeOptions[0],
});

/* FETCH CARRIERS */
async function fetchCarriers() {
	const res = await api.get("/carriers", { params: query });
	if (res?.data) {
		carriers.value = res.data.data;
		totalRecords.value = res.data.total;
	}
}

async function fetchCarriersPage({ page, pageSize }) {
	query.page = page;
	query.pageSize = pageSize;
	await fetchCarriers();
}

const onPageChange = (pageObject) => {
	fetchCarriersPage(pageObject);
};

/* CARRIER PROFILE */
type ActiveCarrierTab = "general";
const activeTab = ref<ActiveCarrierTab>("general");

async function loadCarrierProfile(id: string) {
	const c = await api.get(`/carriers/${id}`);
	if (c?.status === 200) selectedCarrier.value = c.data;
}

async function loadSelectedCarrierProfile() {
	loadCarrierProfile(selectedCarrier.value.id);
}

async function openCarrierProfile() {
	const id = contextMenuSelection.value.id;
	await loadCarrierProfile(id);

	contextMenuSelection.value = null;
}

function closeCarrierProfile() {
	selectedCarrier.value = null;
	fetchCarriers();
}

/* ADD CARRIER */
const addCarrierMode = ref(false);
const addModeToggle = () => {
	addCarrierMode.value = !addCarrierMode.value;
};

const nc = reactive({
	name: undefined,
	email: undefined,
	mobileNumber: undefined,
	notes: undefined,
});

const emptyNc = {
	name: undefined,
	email: undefined,
	mobileNumber: undefined,
	notes: undefined,
};

async function addNewCarrier() {
	if (!nc.name.trim()) return;

	const res = await api.post("/carriers", {
		name: nc.name,
		email: nc.email,
		mobileNumber: nc.mobileNumber,
		notes: nc.notes,
	});

	// handle successs toast
	if (res?.status === 200) {
		showToast({
			severity: "success",
			summary: "Dopravce byl úspěšně vytvořen",
			life: 4000,
		});

		addModeToggle();
		Object.assign(nc, emptyNc); // reset
		await fetchCarriers();
	}
}

/* CONTEXT MENU */
const contextMenu = ref();
const contextMenuSelection = ref(null);

const onContextMenu = (event) =>
	contextMenu.value.openMenu(event.originalEvent);

const menuConfig = [
	{
		label: "Zobrazit detail",
		tablerIcon: IconSearch,
		command: () => openCarrierProfile(),
	},
	{ separator: true },
	{
		label: "Smazat",
		tablerIcon: IconTrash,
		deleteColor: true,
		command: () => {
			const id = contextMenuSelection.value.id;
			const name = contextMenuSelection.value.name;

			confirmCarrierDelete(id, name);
		},
	},
];

/* DELETE CARRIER */
const confirm = useConfirm();

async function deleteCarrier(id, name) {
	const res = await api.delete(`/carriers/${id}`);

	if (res?.status === 200) {
		showToast({
			severity: "success",
			summary: `Dopravce ${name} byl úspěšně smazán`,
			life: 4000,
		});
	}

	await fetchCarriers();
}

function confirmCarrierDelete(id, name) {
	confirm.require({
		header: "Vymazat dopravce",
		message: `Chystáte se smazat dopravce ${name}. Jste si jistí?`,
		acceptLabel: "Ano, smazat!",
		rejectLabel: "Ne, ponechát.",
		accept: () => deleteCarrier(id, name),
	});
}

/* EDIT CARRIER */
const edit = reactive(emptyNc);
const editCard = ref();

function onEdit() {
	edit.name = selectedCarrier.value.name;
	edit.email = selectedCarrier.value.email;
	edit.mobileNumber = selectedCarrier.value.mobileNumber;
	edit.notes = selectedCarrier.value.notes;
}

async function saveSelectedCarrierEdit() {
	if (!edit.name) return;

	const id = selectedCarrier.value.id;
	const res = await api.patch(`/carriers/${id}`, {
		name: edit.name,
		email: edit.email,
		mobileNumber: edit.mobileNumber,
		notes: edit.notes,
	});

	// handle successs toast
	if (res?.status === 200) {
		showToast({
			severity: "success",
			summary: "Dopravce byl úspěšně upraven",
			life: 4000,
		});

		editCard.value.closeEditMode();
		await loadSelectedCarrierProfile();
	}
}

/* PROFILE HEADER */
const headerSubtitle = computed(() => {
	let str = selectedCarrier.value?.email;

	const num = selectedCarrier.value?.mobileNumber;
	if (num) str += ` • ${num}`;

	return str;
});

onMounted(() => fetchCarriers());
</script>

<template>
	<CardTransitionWrapper class="w-full">
		<!-- carrier profile -->
		<Card v-if="selectedCarrier" scrollable>
			<ProfileHeader
				:title="selectedCarrier?.name"
				:subtitle="headerSubtitle"
				:icon="IconTruck"
			>
				<button
					@click="closeCarrierProfile"
					class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 cursor-pointer shadow-sm"
					v-tooltip="{ value: 'Zavřít', showDelay: 500 }"
				>
					<IconX size="14" />
				</button>
			</ProfileHeader>

			<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
				<SmallCardKPI
					title="Zásilky v přepravě"
					subtitle="Naplánované nebo naložené"
					:value="selectedCarrier?.kpi?.parcelsInTransport"
					:icon="IconRoute"
				/>
				<SmallCardKPI
					title="Doručené zásilky"
					subtitle="2026"
					:value="selectedCarrier?.kpi?.deliveredParcelsThisYear"
					:icon="IconPackage"
				/>
				<SmallCardKPI
					title="Doručené palety"
					subtitle="2026"
					:value="selectedCarrier?.kpi?.deliveredPalletsThisYear"
					:icon="IconTruckLoading"
				/>
			</div>

			<Tabs
				v-model:value="activeTab"
				class="flex flex-col flex-1 min-h-0 g-scrollbar"
			>
				<TabList class="text-[13px]">
					<Tab value="general">Všeobecné informace</Tab>
				</TabList>
				<TabPanels class="px-0 pb-0 flex-1 min-h-0">
					<!-- COMMON INFORMATION -->
					<TabPanel value="general" class="flex flex-col gap-6 items-start">
						<div class="w-3xl">
							<!-- contact/details card -->
							<EditableSectionCard
								ref="editCard"
								@edit="onEdit"
								@save="saveSelectedCarrierEdit"
							>
								<template #default="{ isEditing }">
									<!-- NAME -->
									<EditableField label="Název" :editing="isEditing">
										<template #default>
											<span class="font-medium">
												{{ selectedCarrier?.name ?? "-" }}
											</span>
										</template>

										<template #edit>
											<InputText
												v-model="edit.name"
												id="carrier-name"
												size="small"
												maxlength="50"
												fluid
											/>
										</template>
									</EditableField>

									<!-- EMAIL -->
									<EditableField
										label="Email"
										:value="selectedCarrier?.email"
										:editing="isEditing"
									>
										<template #edit>
											<InputText
												v-model="edit.email"
												id="carrier-email"
												size="small"
												maxlength="50"
												fluid
											/>
										</template>
									</EditableField>

									<!-- PHONE NUMBER -->
									<EditableField
										label="Telefon"
										:value="selectedCarrier?.mobileNumber"
										:editing="isEditing"
									>
										<template #edit>
											<InputText
												v-model="edit.mobileNumber"
												id="carrier-mobile-number"
												size="small"
												maxlength="50"
												fluid
											/>
										</template>
									</EditableField>

									<!-- NOTES -->
									<EditableField
										label="Poznámky"
										:value="selectedCarrier?.notes"
										:editing="isEditing"
									>
										<template #edit>
											<InputText
												v-model="edit.notes"
												id="carrier-notes"
												size="small"
												maxlength="255"
												fluid
											/>
										</template>
									</EditableField>
								</template>
							</EditableSectionCard>
						</div>
					</TabPanel>
				</TabPanels>
			</Tabs>
		</Card>

		<!-- carriers table -->
		<Card v-else>
			<CardHeader
				title="Seznam dopravců"
				subtitle="Zde můžete spravovat své dopravce"
			>
				<Button @click="addModeToggle">
					<IconPlus size="16" />
					Přidat dopravce
				</Button>
			</CardHeader>

			<Table
				:value="carriers"
				:totalRecords="totalRecords"
				:rowsPerPageOptions="pageSizeOptions"
				v-model:contextMenuSelection="contextMenuSelection"
				@pageChange="onPageChange"
				@contextMenu="onContextMenu"
				contextMenuSelectionMode
				stateKey="g4pl-carriers"
				paginator
				onlyShow
			>
				<ContextMenu
					ref="contextMenu"
					@hide="contextMenuSelection = null"
					:items="menuConfig"
				/>
				<Column header="Název">
					<template #body="{ data }">
						<span class="font-medium">{{ data.name }}</span>
					</template>
				</Column>
				<Column header="Telefon" field="mobileNumber"></Column>
				<Column header="Email" field="email"></Column>
				<Column header="Poznámky" field="notes"></Column>
			</Table>
		</Card>
	</CardTransitionWrapper>

	<!-- ADD CARRIER -->
	<CardTransitionWrapper>
		<Card v-if="addCarrierMode" class="w-85 text-sm" scrollable>
			<CardHeader title="Nový dopravce" subtitle="Vyplňte povinná pole" />

			<Form>
				<!-- NAME -->
				<FormField title="Název" subtitle="povinné">
					<InputText
						id="g4pl_nc_name"
						v-model="nc.name"
						inputmode="text"
						size="small"
						fluid
						maxlength="50"
					/>
				</FormField>

				<!-- EMAIL -->
				<FormField title="Email">
					<InputText
						id="g4pl_nc_email"
						v-model="nc.email"
						inputmode="text"
						size="small"
						fluid
						maxlength="50"
					/>
				</FormField>

				<!-- MOBILE NUMBER -->
				<FormField title="Telefónní číslo">
					<InputText
						id="g4pl_nc_mobile_number"
						v-model="nc.mobileNumber"
						inputmode="text"
						size="small"
						fluid
						maxlength="50"
					/>
				</FormField>

				<!-- NOTES -->
				<FormField title="Poznámky">
					<InputText
						id="g4pl_nc_notes"
						v-model="nc.notes"
						inputmode="text"
						size="small"
						fluid
						maxlength="255"
					/>
				</FormField>
			</Form>

			<template #bottomActions>
				<CardActions
					variant="create"
					:onPrimary="addNewCarrier"
					:onSecondary="addModeToggle"
				/>
			</template>
		</Card>
	</CardTransitionWrapper>
</template>
