<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref, watch, provide, onMounted, reactive, computed } from "vue";
import { useSessionStorage, useDebounceFn, onClickOutside } from "@vueuse/core";
import {
	formatDate,
	formatPhoneNum,
	formatPsc,
	formatDbDate,
} from "@/utils/formatString";
import { parcelStatus, parcelStatusArray } from "@/config/parcelStatus";
import api from "@/api/base";

import Select from "primevue/select";
import Column from "primevue/column";
import Textarea from "primevue/textarea";
import InputNumber from "primevue/inputnumber";
import ToggleSwitch from "primevue/toggleswitch";
import DatePicker from "primevue/datepicker";
import FloatLabel from "primevue/floatlabel";
import InputTextPrime from "primevue/inputtext";

import {
	IconPoint,
	IconCheck,
	IconChecks,
	IconTruck,
	IconChecklist,
	IconRosetteDiscountCheck,
	IconZoom,
	IconAlertTriangle,
	IconX,
	IconEdit,
	IconPencilCheck,
	IconPencilX,
	IconCircleArrowRightFilled,
	IconCircle,
	IconSettings,
} from "@tabler/icons-vue";

const props = defineProps<{
	stateKey: string;
	mode: "customer" | "provider";
	multiple?: boolean;
	isEditing?: boolean;
	editForm?: object;
	editFormErrors?: object;

	/* filters */
	filterCustomer?: string;
}>();

const emit = defineEmits([
	"rowContextMenu",
	"cancelEdit",
	"saveEdit",
	"clearEditFieldError",
	"fillEditForm",
	"singleParcelSelection",
	"updateEditFormDelivery",
	"updateEditFormPickup",
]);

const selection = defineModel<any[] | {}>("selection");

// use ref="baseRef" on parent component (provider/ParcelsView) where refresh() can be called
// with baseRef.value?.refresh()
defineExpose({ refresh });

const parcels = ref([]);
const totalRecords = ref(0);
const loading = ref(false);
const stateToRestore = ref(null);

const query = reactive({
	page: 0,
	pageSize: 50,
	globalFilter: useSessionStorage(`${props.stateKey}.globalFilter`, undefined), // stateful filter stored in session storage
	status: useSessionStorage(`${props.stateKey}.statusFilter`, undefined), // the key of status e.g. 'DELIVERED'
	preset: undefined,

	/* sort */
	sortField: "pickupDate", // dates
	sortOrder: -1, // 1 = ascending | -1 = descending

	/* more filter options */
	dateType: useSessionStorage(`${props.stateKey}.dateType`, undefined),
	dateFrom: useSessionStorage(`${props.stateKey}.dateFrom`, undefined),
	dateTo: useSessionStorage(`${props.stateKey}.dateTo`, undefined),
	onlyProblem: useSessionStorage(`${props.stateKey}.onlyProblem`, false),
	customer: undefined,
});

async function fetchParcels() {
	// show loader only if request takes longer than some ms (so it does not blink)
	let delayLoading = setTimeout(() => {
		loading.value = true;
	}, 90);

	try {
		const { data } = await api.get("/parcels", {
			params: query,
		});
		parcels.value = data.data;
		totalRecords.value = data.total;
	} finally {
		clearTimeout(delayLoading);
		loading.value = false;
	}
}

async function refresh() {
	// save selected ids
	const selectedIds = new Set(selection.value.map((p) => p.id));

	await fetchParcels();

	// update selection
	selection.value = parcels.value.filter((p) => selectedIds.has(p.id));
}

async function fetchParcelsPage({ page, pageSize }) {
	query.page = page;
	query.pageSize = pageSize;
	await fetchParcels();
}

// debounced parcel fetch while user writes global filter
const debouncedFetchParcelsTyping = useDebounceFn(fetchParcels, 300);
const debouncedFetchParcelsFast = useDebounceFn(fetchParcels, 150);

// watch global filter to fetch filtered parcels
watch(
	() => query.globalFilter, // what to watch
	() => {
		// what to do at change
		debouncedFetchParcelsTyping();
		selection.value = null; // selection might not be in the new parcels
	},
);

// customer filter
watch(
	() => props.filterCustomer,
	(value) => {
		console.log(value);
		query.customer = value || undefined;
		debouncedFetchParcelsTyping();
		selection.value = null;
	},
);

// use session stored query.status to keep UI consistent with query.status
const statusFilter = ref(parcelStatus[query.status] ?? null);

// watch status filter
watch(statusFilter, (value) => {
	query.status = value?.state ?? null;
	fetchParcels();
	selection.value = null; // selection might not be in the new parcels
});

watch(
	() => query.onlyProblem,
	() => {
		debouncedFetchParcelsFast();
		selection.value = null; // selection might not be in the new parcels
	},
);

function onPageChange(pageObject) {
	fetchParcelsPage(pageObject);
	selection.value = null; // selection might not be in the new parcels
}

function onSortChange(pageObject) {
	fetchParcelsPage(pageObject);
}

function onStateRestore(pageObject) {
	stateToRestore.value = pageObject;
}

onMounted(async () => {
	if (stateToRestore.value) {
		if (props.filterCustomer) query.customer = props.filterCustomer;
		await fetchParcelsPage(stateToRestore.value);
	} else {
		await fetchParcels();
	}

	// after parcels are fetched, fill edit form if isEditing mode is on
	if (props.isEditing) emit("fillEditForm");
});

function getSingleSelectedId(selectionValue) {
	if (!selectionValue) return null;

	// multiple mode (selection is array)
	if (Array.isArray(selectionValue)) {
		if (selectionValue.length !== 1) return null;
		return selectionValue[0]?.id ?? null;
	}

	// single mode (selection is object)
	return selectionValue?.id ?? null;
}

// had problem with selection modes: multiple (array), single (object)
// so selectedParcel will be computed object of the selected parcel
// selectedParcel data are then displayed on parcel detail
const selectedParcel = computed(() => {
	const id = getSingleSelectedId(selection.value);
	if (!id) return null;

	const selected = parcels.value.find((p) => p.id === id) ?? null;
	emit("singleParcelSelection", selected);

	return selected;
});

/* object for location details component */
const locationDetails = computed(() =>
	selectedParcel.value
		? {
				pickup: {
					date: selectedParcel.value.pickupDate
						? new Date(selectedParcel.value.pickupDate)
						: null,
					timeFrom: selectedParcel.value.pickupTimeFrom,
					timeTo: selectedParcel.value.pickupTimeTo,
					name: selectedParcel.value.pickupName,
					streetAddress: selectedParcel.value.pickupStreetAddress,
					psc: selectedParcel.value.pickupPsc,
					city: selectedParcel.value.pickupCity,
					state: selectedParcel.value.pickupState,
					contactName: selectedParcel.value.pickupContactName,
					contactPhone: selectedParcel.value.pickupContactPhone,
				},
				delivery: {
					date: selectedParcel.value.deliveryDate
						? new Date(selectedParcel.value.deliveryDate)
						: null,
					timeFrom: selectedParcel.value.deliveryTimeFrom,
					timeTo: selectedParcel.value.deliveryTimeTo,
					name: selectedParcel.value.deliveryName,
					streetAddress: selectedParcel.value.deliveryStreetAddress,
					psc: selectedParcel.value.deliveryPsc,
					city: selectedParcel.value.deliveryCity,
					state: selectedParcel.value.deliveryState,
					contactName: selectedParcel.value.deliveryContactName,
					contactPhone: selectedParcel.value.deliveryContactPhone,
					note: selectedParcel.value.deliveryNote,
				},
			}
		: { pickup: {}, delivery: {} },
);

/* AUTOMATIC LOCATION MODEL (READ, EDIT MODE)*/
const deliveryLocationModel = computed({
	get() {
		/* editForm is reactive object for edit mode */
		/* locationDetails are only to be read */
		return props.isEditing
			? props.editForm.delivery
			: locationDetails.value.delivery;
	},
	set(val) {
		if (!props.isEditing) return;

		/* set the reactive object to values from details component (ParcelLocationDetails) */
		//Object.assign(editForm.value.delivery, val);
		emit("updateEditFormDelivery", val);
	},
});

/* THE SAME AS deliveryLocationModel - AUTOMATIC LOCATION MODEL (READ, EDIT MODE)*/
const pickupLocationModel = computed({
	get() {
		return props.isEditing
			? props.editForm.pickup
			: locationDetails.value.pickup;
	},
	set(val) {
		if (!props.isEditing) return;
		//Object.assign(editForm.value.pickup, val);
		emit("updateEditFormPickup", val);
	},
});

const isSelected = (id) => {
	const sel = selection.value;

	if (Array.isArray(sel)) {
		return sel.find((el) => el.id === id);
	}
	return sel?.id === id;
};

const filtersOpen = ref();
const filtersMenuRef = ref(null);
onClickOutside(filtersMenuRef, () => (filtersOpen.value = false), {
	ignore: [".p-datepicker", ".p-datepicker-panel", ".p-select-overlay"],
});

const dateTypeToFilterByOptions = [
	{
		label: "datum objednání",
		value: "createdAt",
	},
	{
		label: "datum nakládky",
		value: "pickupDate",
	},
	{
		label: "datum vykládky",
		value: "deliveryDate",
	},
];

const areAnyFiltersSetInsideMenu = computed(() => {
	return query.onlyProblem || query.dateFrom || query.dateTo;
});

provide("fieldWidth", 30); // to set width of field header in FormField (used in Parcel Details)
</script>

<template>
	<!-- MAIN CONTENT -->
	<Card class="flex-1 flex flex-col">
		<CardHeader title="Tabulka zásilek" subtitle="Vaše zásilky na jednem místě">
			<!-- global filter -->
			<InputText
				id="parcels-global-filter"
				v-model="query.globalFilter"
				label="Vyhledat zásilku"
				:icon="IconZoom"
				useClear
			/>

			<!-- use this to add more filter options between global filter and status filter  -->
			<slot name="headerFilters"></slot>

			<!-- status filter -->
			<Select
				v-model="statusFilter"
				:options="parcelStatusArray"
				showClear
				placeholder="Stav zásilky"
				:pt="{
					root: `rounded-2xl text-xs w-46 ${statusFilter ?? 'py-[2.55px]'}`,
					label: 'text-xs font-medium',
					dropdown: 'w-6 mr-2 ml-0.5',
					dropdownIcon: 'size-4',
					clearIcon: 'size-4',
				}"
			>
				<template #value="slotProps">
					<div v-if="slotProps.value">
						<Tag
							:icon="slotProps.value.icon"
							:label="slotProps.value.label"
							:status="slotProps.value.state"
						/>
					</div>
				</template>

				<template #option="{ option }">
					<Tag
						:icon="option.icon"
						:label="option.label"
						:status="option.state"
					/>
				</template>
			</Select>

			<!-- filters menu -->
			<div class="relative" ref="filtersMenuRef">
				<button
					@click="filtersOpen = !filtersOpen"
					class="g-button-select-style relative"
				>
					<IconSettings size="17" class="text-slate-400 mr-1.5" />
					Nastavení filtrů

					<!-- badge that shows if any of the settings inside of filters menu where set -->
					<div
						v-if="areAnyFiltersSetInsideMenu"
						class="absolute -top-0.5 right-0.5 size-2.5 outline-2 outline-white bg-red-500 rounded-full transition-all"
					/>
				</button>

				<PopupTransitionWrapper>
					<PopupMenu :visible="filtersOpen">
						<!-- filter by date -->
						<!-- 	<div class="space-y-1.5">
								<div class="text-slate-600 font-medium">Datumy</div>

								<Select
									:options="dateTypeToFilterByOptions"
									optionLabel="label"
									placeholder="Typ datumu"
									fluid
									resetFilterOnClear
									showClear
									:pt="{
										root: 'rounded-lg text-xs ',
										label: 'text-sm py-[7px]',
										option: 'text-sm',
										dropdownIcon: 'size-3',
										clearIcon: 'size-3',
									}"
								/>

								<FloatLabel variant="on">
									<DatePicker
										:v-model="undefined"
										inputId="dateFrom"
										dateFormat="dd.mm.yy"
										size="small"
										fluid
										:pt="{ dayView: 'text-sm' }"
									/>
									<label for="dateFrom" class="font-normal">Datum od</label>
								</FloatLabel>

								<FloatLabel variant="on">
									<DatePicker
										:v-model="undefined"
										inputId="dateTo"
										dateFormat="dd.mm.yy"
										size="small"
										fluid
										:pt="{ dayView: 'text-sm' }"
									/>
									<label for="dateTo" class="font-normal">Datum do</label>
								</FloatLabel>
							</div> -->

						<!-- filter only problematic parcels -->
						<div>
							<div class="text-slate-600 font-medium mb-1">Neshoda</div>
							<div
								class="flex text-nowrap items-center gap-2 px-2.5 py-1.5 text-slate-500 text-sm border border-slate-300 hover:border-slate-400 rounded-md"
							>
								<span>Zobrazit jenom neshody</span>
								<ToggleSwitch
									v-model="query.onlyProblem"
									class="flex scale-85"
								/>
							</div>
						</div>
					</PopupMenu>
				</PopupTransitionWrapper>
			</div>
		</CardHeader>

		<!-- TABLE -->
		<Table
			:value="parcels"
			:totalRecords="totalRecords"
			v-model:selection="selection"
			v-model:sortField="query.sortField"
			v-model:sortOrder="query.sortOrder"
			@pageChange="onPageChange"
			@stateRestore="onStateRestore"
			@sortChange="onSortChange"
			@contextMenu="emit('rowContextMenu', $event)"
			paginator
			:stateKey="stateKey"
			:loading="loading"
			:multiple="multiple"
		>
			<Column>
				<template #body="{ data }" class="transition-all">
					<IconCircleArrowRightFilled
						v-if="isSelected(data.id)"
						size="22"
						class="text-primary"
					/>
					<IconCircle
						v-else
						size="22"
						class="text-zinc-300 hover:text-zinc-400"
					/>
				</template>
			</Column>

			<!-- COLUMNS START SLOT -->
			<slot name="columnsStart" :parcelStatus="parcelStatus" />

			<Column field="deliveryName" header="Vykládka název" />
			<Column field="deliveryCity" header="Vykládka město" />
			<Column field="createdAt" header="Datum objednání" sortable>
				<template #body="{ data }">
					{{ data.orderedAt.date }}
				</template>
				<template #sorticon="slotProps">
					<SortIcon v-bind="slotProps" />
				</template>
			</Column>
			<Column field="pickupDate" header="Datum nakládky" sortable>
				<template #body="{ data }">
					{{ formatDate(data.pickupDate).date }}
				</template>
				<template #sorticon="slotProps">
					<SortIcon v-bind="slotProps" />
				</template>
			</Column>
			<Column field="deliveryDate" header="Datum vykládky" sortable>
				<template #body="{ data }">
					{{ formatDate(data.deliveryDate).date }}
				</template>
				<template #sorticon="slotProps">
					<SortIcon v-bind="slotProps" />
				</template>
			</Column>
			<Column field="palletsCount" header="Počet palet" />
			<Column header="DL připojen">
				<template #body="{ data }">
					<Tag
						v-if="
							data.billOfLadingAttachmentStatus ===
							'UNCONFIRMED_BILL_OF_LADING_NOT_ATTACHED_IN_TIME'
						"
						v-tooltip="{ value: 'Chybí nepotvrzený DL', showDelay: 400 }"
						:icon="IconX"
						variant="INACTIVE"
						iconOnly
					/>
					<Tag
						v-else-if="
							data.billOfLadingAttachmentStatus ===
							'UNCONFIRMED_BILL_OF_LADING_ATTACHED'
						"
						v-tooltip="{ value: 'Připojen nepotvrzený DL', showDelay: 400 }"
						:icon="IconCheck"
						variant="UNCONFIRMED-BILL-OF-LOADING-ATTACHED"
						iconOnly
					/>
					<Tag
						v-else-if="
							data.billOfLadingAttachmentStatus ===
							'CONFIRMED_BILL_OF_LADING_ATTACHED'
						"
						v-tooltip="{ value: 'Připojen potvrzený DL', showDelay: 400 }"
						:icon="IconChecks"
						status="DELIVERED"
						iconOnly
					/>
				</template>
			</Column>
			<Column header="Neshoda">
				<template #body="{ data }">
					<Tag
						v-if="data.problem"
						:icon="IconAlertTriangle"
						variant="PROBLEM"
						iconOnly
					/>
				</template>
			</Column>
		</Table>

		<!-- CONTEXT MENU SLOT -->
		<slot name="contextMenu" />
	</Card>

	<!-- SIDE CONTENT -->
	<CardTransitionWrapper>
		<Card
			v-if="selectedParcel"
			:class="['transition-all duration-180', isEditing ? 'w-85' : 'w-70']"
			scrollable
		>
			<!-- HEADER -->
			<CardHeader
				title="Detail zásilky"
				:subtitle="
					isEditing
						? 'Upravte údaje a změny následně uložte'
						: 'Všechny informace a dokumenty'
				"
				sideContentHeader
			/>

			<!-- SINGLE DATA FIELDS -->
			<FormField v-if="mode === 'provider'" title="Zákazník" compact>
				{{ selectedParcel?.customer?.name }}
			</FormField>
			<FormField v-if="mode === 'provider'" title="ID" compact>
				{{ selectedParcel?.customer?.code }}{{ selectedParcel?.sequenceNum }}
			</FormField>
			<FormField title="Číslo DL" compact class="text-nowrap">
				<span class="text-nowrap">
					{{ selectedParcel?.billOfLadingNum }}
				</span>
			</FormField>
			<FormField title="Reference" compact>
				{{ selectedParcel?.reference }}
			</FormField>
			<FormField title="Typ" compact>
				{{ selectedParcel?.type }}
			</FormField>
			<FormField title="Počet palet" compact>
				<InputNumber
					v-if="isEditing"
					v-model="editForm.palletsCount"
					:min="0"
					:allowEmpty="false"
					showButtons
					fluid
					size="small"
				/>
				<span v-else>{{ selectedParcel?.palletsCount }}</span>
			</FormField>
			<FormField title="Počet lož. míst" compact>
				<InputNumber
					v-if="isEditing"
					v-model="editForm.palletSpacesCount"
					v-tooltip.left="{
						value: 'Pro desetinné číslo použijte tečku',
						showDelay: 300,
					}"
					:min="0"
					:minFractionDigits="0"
					:maxFractionDigits="1"
					:allowEmpty="false"
					showButtons
					fluid
					size="small"
				/>
				<span v-else>{{ selectedParcel?.palletSpacesCount }}</span>
			</FormField>
			<FormField title="Hmotnost" compact>
				<div v-if="isEditing">
					<InputNumber
						v-model="editForm.weight"
						suffix=" kg"
						:invalid="!!editFormErrors.general.weight"
						@update:modelValue="
							emit('clearEditFieldError', {
								section: 'general',
								field: 'weight',
							})
						"
						v-tooltip.left="{
							value: 'Pro desetinné číslo použijte tečku',
							showDelay: 300,
						}"
						:min="0"
						:minFractionDigits="0"
						:maxFractionDigits="3"
						:allowEmpty="false"
						showButtons
						fluid
						size="small"
					/>
					<ErrorMessage v-if="editFormErrors.general.weight">
						{{ editFormErrors.general.weight }}
					</ErrorMessage>
				</div>
				<span v-else>
					{{ selectedParcel?.weight }}
					<SubText v-if="selectedParcel?.weight">kg</SubText>
				</span>
			</FormField>
			<FormField title="Teplotní režim" compact>
				<div v-if="isEditing">
					<InputTextPrime
						v-model="editForm.temperatureMode"
						:invalid="!!editFormErrors.general.temperatureMode"
						@update:modelValue="
							emit('clearEditFieldError', {
								section: 'general',
								field: 'temperatureMode',
							})
						"
						inputmode="text"
						fluid
						maxLength="2"
						size="small"
					/>
				</div>
				<div v-else>
					{{ selectedParcel?.temperatureMode }}
				</div>
			</FormField>
			<FormField v-if="mode === 'provider'" title="Dopravce" compact>
				{{ selectedParcel?.selectedCarrier?.name }}
			</FormField>
			<FormField title="Objednávka z" compact>
				{{ selectedParcel?.orderedAt?.date }}
				<SubText>
					{{ selectedParcel?.orderedAt?.time }}
				</SubText>
			</FormField>
			<FormField v-if="mode === 'customer'" title="Poznámka" compact>
				<template v-if="selectedParcel?.note" #details>
					<LinkifiedText :text="selectedParcel.note" />
				</template>
			</FormField>
			<FormField
				v-if="mode === 'provider' && selectedParcel?.invoiceNumber"
				title="Faktura"
				compact
			>
				{{ selectedParcel?.invoiceNumber }}
			</FormField>

			<FormField
				v-if="selectedParcel.cashOnDelivery?.amount"
				title="Dobírka"
				compact
			>
				<div v-if="isEditing" class="flex flex-col gap-1">
					<InputNumber
						v-model="editForm.cashOnDeliveryAmount"
						@update:modelValue="
							emit('clearEditFieldError', {
								section: 'general',
								field: 'weight',
							})
						"
						v-tooltip.left="{
							value: 'Pro desetinné číslo použijte tečku',
							showDelay: 300,
						}"
						:format="false"
						:min="1"
						:minFractionDigits="0"
						:maxFractionDigits="2"
						:allowEmpty="false"
						showButtons
						fluid
						size="small"
					/>
					<InputTextPrime
						v-model="editForm.cashOnDeliveryCurrency"
						:invalid="!!editFormErrors.general.temperatureMode"
						@update:modelValue="
							emit('clearEditFieldError', {
								section: 'general',
								field: 'temperatureMode',
							})
						"
						v-tooltip.left="{
							value: 'Tří-písmenný kód měny (CZK, EUR, USD, ...)',
							showDelay: 300,
						}"
						inputmode="text"
						fluid
						:maxLength="3"
						size="small"
					/>
				</div>
				<div v-else>
					<div
						v-tooltip.top="
							`Vyplaceno ${selectedParcel.cashOnDelivery?.paidOutDate}`
						"
					>
						{{ selectedParcel.cashOnDelivery?.amount }}
						<SubText>
							{{ selectedParcel.cashOnDelivery?.currencySymbol }}
						</SubText>
					</div>
				</div>
			</FormField>

			<FormField
				v-if="selectedParcel.cashOnDelivery?.amount"
				title="Datum vyplacení dobírky"
				compact
			>
				<div v-if="isEditing">
					<DatePicker
						v-model="editForm.cashOnDeliveryPaidOutDate"
						:invalid="!!editFormErrors.general.cashOnDeliveryPaidOutDate"
						@update:modelValue="
							emit('clearEditFieldError', {
								section: 'general',
								field: 'cashOnDeliveryPaidOutDate',
							})
						"
						dateFormat="dd.mm.yy"
						size="small"
						fluid
						:pt="{ dayView: 'text-sm' }"
					/>
				</div>
				<div v-else>
					{{ formatDbDate(selectedParcel.cashOnDeliveryPaidOutDate) }}
				</div>
			</FormField>

			<!-- DELIVERY LOCATION -->
			<FormField compact class="relative">
				<template #title>
					Vykládka
					<Tag
						v-if="['DELIVERED', 'CLOSED'].includes(selectedParcel?.status)"
						:icon="IconCheck"
						status="DONE"
						iconOnly
						class="absolute right-1 -top-0.5"
					/>
				</template>

				<template #details>
					<ParcelLocationDetails
						v-model="deliveryLocationModel"
						locationType="delivery"
						:isEditing="isEditing"
						:editErrors="editFormErrors?.delivery"
						@clearEditError="emit('clearEditFieldError', $event)"
					/>
				</template>
			</FormField>

			<!-- PICKUP LOCATION -->
			<FormField compact class="relative">
				<template #title>
					Nakládka
					<Tag
						v-if="
							['LOADED', 'DELIVERED', 'CLOSED'].includes(selectedParcel?.status)
						"
						:icon="IconCheck"
						status="DONE"
						iconOnly
						class="absolute right-1 -top-0.5"
					/>
				</template>
				<template #details>
					<ParcelLocationDetails
						v-model="pickupLocationModel"
						locationType="pickup"
						:isEditing="isEditing"
						:editErrors="editFormErrors?.pickup"
						@clearEditError="emit('clearEditFieldError', $event)"
					/>
				</template>
			</FormField>

			<!-- LAST FIELD SLOT -->
			<slot name="lastDetailsField" />

			<!-- DOCUMENTS -->
			<FormField title="Dokumenty" compact noDivider>
				<template #details>
					<!-- PARCEL DOCUMENTS (BILL OF LADING, ...)-->
					<div
						v-if="selectedParcel?.documents?.length"
						v-for="document in selectedParcel?.documents"
						class="flex items-baseline gap-2 space-y-1"
					>
						<a
							:href="`/api/parcels/document/${document.id}`"
							target="_blank"
							class="text-primary hover:underline cursor-pointer"
							v-tooltip="{
								value:
									document.type === 'UNCONFIRMED_BILL_OF_LADING'
										? 'Dodací list nepotvrzený příjemcem'
										: document.type === 'CONFIRMED_BILL_OF_LADING'
											? 'Dodací list potvrzený příjemcem'
											: '',
								showDelay: 1000,
							}"
						>
							<span v-if="document.type === 'UNCONFIRMED_BILL_OF_LADING'">
								Nepotvrzený DL
							</span>
							<span v-if="document.type === 'CONFIRMED_BILL_OF_LADING'">
								Potvrzený DL
							</span>
						</a>
					</div>

					<!-- NO DOCUMENTS ATTACHED -->
					<div v-if="!selectedParcel?.documents?.length" class="text-xs">
						K této zásilce zatím nebyly připojeny žádné elektronické dokumenty.
					</div>
				</template>
			</FormField>

			<!-- EDIT MODE CONTROLLS THAT EMIT TO provider/ParcelsView -->
			<template #bottomActions>
				<CardActions
					v-if="isEditing"
					variant="edit"
					:onPrimary="() => emit('saveEdit', editForm)"
					:onSecondary="() => emit('cancelEdit')"
				/>
			</template>
		</Card>
	</CardTransitionWrapper>
</template>
