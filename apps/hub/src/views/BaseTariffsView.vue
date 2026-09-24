<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref, computed, reactive, watch, onBeforeMount } from "vue";
import { toDateOnlyString } from "@/utils/formatString";
import { downloadFileFromResponse } from "@/utils/downloadFile";
import { showToast } from "@/services/toast";
import IconFileTypeXlsx from "@/components/icons/IconFileTypeXlsx.vue";
import api from "@/api/base";

import Column from "primevue/column";
import InputText from "primevue/inputtext";
import SelectButton from "primevue/selectbutton";
import DatePicker from "primevue/datepicker";
import MultiSelect from "primevue/multiselect";
import { useConfirm } from "primevue/useconfirm";

import {
	IconPlus,
	IconArchiveFilled,
	IconCheck,
	IconX,
	IconClock,
	IconFileDownload,
	IconArchiveOff,
	IconArchive,
	IconTrash,
	IconEdit,
} from "@tabler/icons-vue";

const confirm = useConfirm();

const props = defineProps<{
	context: "carriers" | "customers";
}>();

const tariffs = ref([]);
const selectedTariff = ref();
const subjects = ref([]);

async function loadTariffs() {
	const res = await api.get(
		`/tariffs/${props.context === "carriers" ? "COST" : "REVENUE"}`,
	);
	if (res?.data) tariffs.value = res?.data;

	if (selectedTariff.value) {
		selectedTariff.value = tariffs.value.find(
			(t) => t.id === selectedTariff.value.id,
		);
	}
}

async function loadSubjects() {
	const subjectsPath =
		props.context === "carriers" ? "/carriers/reduced" : "/customers/reduced";

	const res = await api.get(subjectsPath);
	if (res?.data) subjects.value = res?.data;
}

onBeforeMount(async () => await loadTariffs());

const contextMenu = ref();
const menuConfig = computed(() => [
	{
		label: "Upravit",
		tablerIcon: IconEdit,
		command: () => console.log("edit tariff"),
		visible: false,
	},
	{
		label: "Stáhnout soubor",
		tablerIcon: IconFileDownload,
		command: () => downloadSelectedTariff(),
	},
	{
		label:
			selectedTariff.value?.status === "ARCHIVED"
				? "Zrušit archivaci"
				: "Archivovat",
		tablerIcon:
			selectedTariff.value?.status === "ARCHIVED"
				? IconArchiveOff
				: IconArchive,
		warnColor: true,
		command: () => {
			if (selectedTariff.value?.status === "ARCHIVED") {
				unarchivateSelectedTariff();
			} else {
				archivateSelectedTariff();
			}
		},
	},
	{
		label: "Smazat",
		tablerIcon: IconTrash,
		deleteColor: true,
		command: () => confirmToDeleteSelectedTariff(),
	},
]);

const onContextMenu = (event) => {
	const rightClicked = event.data;
	if (selectedTariff.value !== rightClicked) {
		selectedTariff.value = rightClicked;
	}
	contextMenu.value.openMenu(event.originalEvent);
};

const addTariffMode = ref<boolean>(false);
const setAddTariffMode = () => {
	if (addTariffMode.value) return;

	loadSubjects();
	selectedTariff.value = null;
	addTariffMode.value = true;
};

const nt = reactive({
	name: { value: null, invalid: false, errMessage: null },
	structure: { value: null, invalid: false }, // ALL_IN_ONE | SPLIT
	calculation: { value: null, invalid: false }, // PALLET | WEIGHT
	validFrom: { value: null, invalid: false },
	validTo: { value: null, invalid: false },
	file: { value: null, invalid: false, empty: false },
	subjects: { value: null, invalid: false },
});
const optionalFields = ["validTo"];

const ntLoading = ref(false);
const ntErrors = ref([]);

const ntInvalid = computed(() =>
	Object.values(nt).some((field) => field.invalid),
);

async function uploadNewTariff() {
	/* ntInvalid.value = false; */

	// check if any (non optional) field is empty
	for (const key in nt) {
		const value = nt[key as any].value;

		const isValueEmpty = !value;
		const isArrayEmpty = Array.isArray(value) && value.length === 0;

		if ((isValueEmpty || isArrayEmpty) && !optionalFields.includes(key)) {
			/* ntInvalid.value = true; */
			if (key === "file") {
				nt.file.empty = true;
				continue;
			}
			nt[key as any].invalid = true;
		}
	}

	// check name valid
	if (nt.name.errMessage) isInvalid.value = true;

	// check validFrom > validTo
	if (nt.validTo.value && nt.validFrom?.value > nt.validTo.value) {
		/* ntInvalid.value = true; */
		nt.validFrom.invalid = true;
		nt.validTo.invalid = true;
	}

	// form is invalid sink
	if (ntInvalid.value) return;

	ntLoading.value = true;

	try {
		const formData = new FormData();

		formData.append("name", nt.name.value);
		formData.append(
			"purpose",
			props.context === "carriers" ? "COST" : "REVENUE",
		);
		formData.append("structure", nt.structure.value?.option);
		formData.append("calculation", nt.calculation.value?.option);
		formData.append("validFrom", toDateOnlyString(nt.validFrom.value));
		formData.append(
			"validTo",
			nt.validTo.value ? toDateOnlyString(nt.validTo.value) : undefined,
		);
		formData.append("file", nt.file.value as Blob);

		const where =
			props.context === "carriers" ? "carrierIds[]" : "customerCompanyIds[]";

		nt.subjects.value.forEach((c) => {
			formData.append(where, c.id);
		});

		const res = await api.post("/tariffs", formData, { skipToast: true });

		if (res.data?.success) {
			showToast({
				severity: "success",
				summary: "Tarif úspěšně vytvořen",
				life: 5000,
			});
		}

		await loadTariffs();
		resetNtForm();
	} catch (err) {
		const data = err?.response?.data;

		// data.errors are only specified if file errors occur
		if (data && data?.errors) {
			ntErrors.value = data.errors;

			if (data.errorCode === "BAD_FILE_FORMAT") {
				nt.file.invalid = true;
			} else if (data.errorCode === "VALID_PERIOD_OVERLAP") {
				nt.validFrom.invalid = true;
				if (nt.validTo.value) nt.validTo.invalid = true;
			}
		}

		showToast({
			severity: "error",
			summary: data.message,
			life: 4000,
		});
	} finally {
		ntLoading.value = false;
	}
}

const resetNtForm = () => {
	/* ntInvalid.value = false; */
	ntLoading.value = false;
	ntErrors.value = [];
	fileSelect.value.clear();

	for (const key in nt) {
		nt[key as any].value = null;
		nt[key as any].invalid = false;
	}

	nt.name.errMessage = null;
	nt.file.empty = false;
};

// turn off invalid state after user starts interacting with the field again
for (const key in nt) {
	watch(
		() => nt[key as any].value,
		() => {
			if (nt[key as any].invalid) {
				nt[key as any].invalid = false;
				if (key === "name") nt.name.errMessage = null;
			}
		},
	);
}

// close add tariff mode on tariff select
watch(
	() => selectedTariff.value,
	() => {
		if (selectedTariff.value) addTariffMode.value = false;
	},
);

// watch for a tariff name unique constraint
watch(
	() => nt.name.value,
	(value) => {
		if (!value) return;

		if (isTariffNameTaken()) {
			/* ntInvalid.value = true; */
			nt.name.invalid = true;
			nt.name.errMessage = "Název je již používán jiným tarifem.";
		} else {
			/* 	ntInvalid.value = false; */
			nt.name.invalid = false;
			nt.name.errMessage = null;
		}
	},
);

function isTariffNameTaken() {
	return tariffs.value.some(
		(tariff) =>
			tariff.name.trim().toLowerCase() === nt.name.value?.trim().toLowerCase(),
	);
}

/* used for GFileSelect as ref value -> .upload() and .clear() */
const fileSelect = ref();

const onFileSelected = (file) => {
	nt.file.value = file;
	nt.file.empty = false;
	nt.file.invalid = false;
	ntErrors.value = [];
};

const ntStructureOptions = [
	{ name: "Společně", option: "ALL_IN_ONE" },
	{ name: "Svoz/rozvoz", option: "SPLIT" },
];
const ntCalculationOptions = [
	{ name: "Paletový", option: "PALLET" },
	{ name: "Kilogramový", option: "WEIGHT" },
];

/* DOWNLOAD TARIFF */
async function downloadSelectedTariff() {
	const res = await api.get(`/tariffs/${selectedTariff.value.id}/download`, {
		responseType: "blob",
	});

	downloadFileFromResponse(res);
}

/* ARCHIVATE TARIFF */
async function archivateSelectedTariff() {
	await api.post(`/tariffs/${selectedTariff.value.id}/archivate`);
	await loadTariffs();
}

/* UNARCHIVATE TARIFF */
async function unarchivateSelectedTariff() {
	await api.post(`/tariffs/${selectedTariff.value.id}/unarchivate`);
	await loadTariffs();
}

/* DELETE TARIFF */
async function deleteSelectedTariff() {
	await api.post(`/tariffs/${selectedTariff.value.id}/delete`);
	await loadTariffs();
}

/* CONFIRMATION TO DELETE TARIFF */
function confirmToDeleteSelectedTariff() {
	confirm.require({
		header: "Vymazat tarif",
		message: `Chystáte se smazat tarif "${selectedTariff.value.name}". Jste si jistí?`,
		acceptLabel: "Ano, smazat!",
		rejectLabel: "Ne, ponechát.",
		accept: () => {
			deleteSelectedTariff();
		},
	});
}

type TariffStatusKey = "ARCHIVED" | "ACTIVE" | "INACTIVE" | "WAITING";
const tariffStatus: Record<TariffStatusKey, { label: string; icon: Icon }> = {
	ARCHIVED: {
		label: "archivován",
		icon: IconArchiveFilled,
	},
	ACTIVE: {
		label: "aktivní",
		icon: IconCheck,
	},
	INACTIVE: {
		label: "neaktivní",
		icon: IconX,
	},
	WAITING: {
		label: "čekající",
		icon: IconClock,
	},
};

const xlsxMimeType =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const subjectsToShow = ref<number>(4);

const subjectName = props.context === "carriers" ? "Dopravci" : "Zákazníci";

const multiselectPlaceholder =
	props.context === "carriers" ? "Vyberte dopravců" : "Vyberte zákazníků";
</script>

<template>
	<!-- MAIN CONTENT -->
	<CardTransitionWrapper>
		<!-- CREATE TARIFF DETAILED ERRORS -->
		<Card v-if="ntErrors.length" class="flex-1">
			<CardHeader
				title="Podrobné chybové zprávy"
				subtitle="Při vytvářaní tarifu došlo k chybě"
			>
				<Button @click="ntErrors = []" variant="outlined">
					<IconX size="16" />
				</Button>
			</CardHeader>
			<div v-for="error in ntErrors" class="text-red-600">
				{{ error }}
			</div>
		</Card>

		<!-- TARIFFS TABLE -->
		<Card v-else class="flex-1">
			<CardHeader
				title="Tabulka tarifů"
				:subtitle="`Spravujte své ${context === 'carriers' ? 'nákladové' : 'výnosové'} tarify`"
			>
				<!-- add tariff button -->
				<Button @click="setAddTariffMode" scale>
					<IconPlus size="16" />
					Přidat tarif
				</Button>
			</CardHeader>

			<Table
				:value="tariffs"
				v-model:selection="selectedTariff"
				@contextMenu="onContextMenu"
			>
				<ContextMenu ref="contextMenu" :items="menuConfig" />
				<Column field="name" header="Název" class="font-medium" />
				<Column field="status" header="Status">
					<template #body="slotProps">
						<Tag
							:variant="slotProps.data.status"
							:label="
								tariffStatus[slotProps.data.status as TariffStatusKey].label
							"
							:icon="
								tariffStatus[slotProps.data.status as TariffStatusKey].icon
							"
						/>
					</template>
				</Column>
				<Column :header="subjectName">
					<template #body="slotProps">
						<div
							v-for="(subject, index) in slotProps.data.subjects"
							class="inline-flex"
						>
							<Tag
								v-if="index < subjectsToShow"
								:class="{ 'mr-1': index < subjectsToShow }"
								variant="SUBJECT"
							>
								{{ subject.value }}
							</Tag>
						</div>

						<Tag
							v-if="slotProps.data?.subjects?.length > subjectsToShow"
							variant="SUBJECT"
						>
							+{{ slotProps.data.subjects.length - subjectsToShow }}
						</Tag>
					</template>
				</Column>
				<Column field="validFrom" header="Platnost od" />
				<Column field="validTo" header="Platnost do" />
			</Table>
		</Card>
	</CardTransitionWrapper>

	<!-- SIDE CONTENT -->
	<CardTransitionWrapper>
		<Card v-if="selectedTariff" class="w-72" scrollable>
			<CardHeader
				title="Detail tarifu"
				subtitle="Údaje a základní funkce"
				sideContentHeader
			/>

			<FormField title="Název" compact>
				{{ selectedTariff?.name }}
			</FormField>

			<FormField title="Typ" compact>
				{{ selectedTariff?.calculation }}
			</FormField>

			<FormField title="Struktura" compact>
				{{ selectedTariff?.structure }}
			</FormField>

			<FormField title="Začátek platnosti" compact>
				{{ selectedTariff?.validFrom }}
				<SubText>00:00</SubText>
			</FormField>

			<FormField title="Konec platnosti" compact>
				<span v-if="selectedTariff?.validTo">
					{{ selectedTariff?.validTo }}
					<SubText>23:59</SubText>
				</span>
			</FormField>

			<FormField :title="subjectName" compact>
				<template #details>
					<div class="flex flex-wrap gap-1">
						<div v-for="subject in selectedTariff?.subjects">
							<Tag variant="SUBJECT">
								{{ subject.value }}
							</Tag>
						</div>
					</div>
				</template>
			</FormField>

			<FormField title="Poslední změna" compact>
				{{ selectedTariff?.updated?.date }}
				<SubText>{{ selectedTariff?.updated?.time }}</SubText>
			</FormField>

			<FormField title="Vytvořen" compact>
				{{ selectedTariff?.created?.date }}
				<SubText>{{ selectedTariff?.created?.time }}</SubText>
			</FormField>

			<FormField title="Vytvořil" compact noDivider>
				{{ selectedTariff?.created?.by?.firstName }}
				{{ selectedTariff?.created?.by?.lastName }}
			</FormField>
		</Card>

		<Card v-if="addTariffMode" class="w-85" scrollable>
			<CardHeader
				title="Přidat tarif"
				subtitle="Vyplňte všechna povinná pole"
			/>

			<Form>
				<!-- ntName -->
				<FormField title="Název">
					<InputText
						id="g4pl_nt_name"
						inputmode="text"
						v-model="nt.name.value"
						:invalid="nt.name.invalid"
						fluid
						placeholder="Zadejte název"
						maxLength="24"
						size="small"
					/>
					<ErrorMessage v-if="nt.name.errMessage">
						{{ nt.name.errMessage }}
					</ErrorMessage>
				</FormField>

				<!-- ntCalculation -> "PALLET | "WEIGHT" -->
				<FormField title="Typ">
					<SelectButton
						v-model="nt.calculation.value"
						:invalid="nt.calculation.invalid"
						:options="ntCalculationOptions"
						optionLabel="name"
						fluid
						size="small"
						:allowEmpty="false"
					/>
				</FormField>

				<!-- ntStructure -> "ALL_IN_ONE" | "SPLIT" -->
				<FormField title="Struktura">
					<SelectButton
						v-model="nt.structure.value"
						:invalid="nt.structure.invalid"
						:options="ntStructureOptions"
						optionLabel="name"
						fluid
						size="small"
						:allowEmpty="false"
					/>
				</FormField>

				<!-- ntValidFrom -> DateTime -->
				<FormField title="Začátek platnosti" subtitle="Od 00:00">
					<DatePicker
						v-model="nt.validFrom.value"
						:invalid="nt.validFrom.invalid"
						dateFormat="dd.mm.yy"
						placeholder="Vyberte datum"
						size="small"
						fluid
					/>
				</FormField>

				<!-- ntValidTo? -> DateTime -->
				<FormField title="Konec platnosti (volitelné)" subtitle="Do 23:59">
					<DatePicker
						v-model="nt.validTo.value"
						:invalid="nt.validTo.invalid"
						dateFormat="dd.mm.yy"
						placeholder="Vyberte datum"
						showClear
						size="small"
						fluid
					/>
				</FormField>

				<!-- ntFile -> selected xlsx tariff data -->
				<FormField title="Soubor s daty tarifu - zóny a sazby">
					<FileUpload
						ref="fileSelect"
						label="Vybrat soubor"
						@fileSelected="onFileSelected"
						:accept="xlsxMimeType"
						:icon="IconFileTypeXlsx"
						:invalid="nt.file.invalid || nt.file.empty"
					/>
				</FormField>

				<!-- ntCarriersIds -> array of choosen carriers ids -->
				<FormField :title="subjectName">
					<MultiSelect
						inputId="tariff_subjects_new_tariff"
						v-model="nt.subjects.value"
						:invalid="nt.subjects.invalid"
						:options="subjects"
						:optionLabel="context === 'carriers' ? 'name' : 'code'"
						filter
						fluid
						:placeholder="multiselectPlaceholder"
						size="small"
					/>
				</FormField>
			</Form>

			<template #bottomActions>
				<CardActions
					variant="create"
					:onPrimary="uploadNewTariff"
					:onSecondary="
						() => {
							addTariffMode = false;
							resetNtForm();
						}
					"
					:disabled="ntInvalid"
					:loading="ntLoading"
				/>
			</template>
		</Card>
	</CardTransitionWrapper>
</template>
