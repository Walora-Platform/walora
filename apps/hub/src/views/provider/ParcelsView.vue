<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from "vue";
import { useSessionStorage } from "@vueuse/core";
import { parcelStatus, type ParcelStatusKey } from "@/config/parcelStatus";
import {
	formatDate,
	formatParcelTime,
	formatPscReverse,
} from "@/utils/formatString";
import { showToast } from "@/services/toast";
import { toDateOnlyString } from "@/utils/formatString";
import api from "@/api/base";

import GBaseParcelsView from "@/views/BaseParcelsView.vue";

import Column from "primevue/column";
import ContextMenu from "primevue/contextmenu";
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import { useConfirm } from "primevue/useconfirm";

import {
	IconStatusChange,
	IconChevronRight,
	IconEdit,
	IconAlertTriangle,
	IconAlertTriangleOff,
	IconTrash,
	IconUsers,
	IconLock,
	IconLockOpen,
} from "@tabler/icons-vue";

const cm = ref();
const baseRef = ref();
const selection = ref<any[] | undefined>();

/* - STATEFUL EDIT MODE - */
const editingParcelId = ref<string | null>(
	useSessionStorage("editingParcelId", null),
);

const editForm = reactive({
	type: null,
	palletsCount: null,
	palletSpacesCount: null,
	weight: null,
	temperatureMode: null,
	note: null,
	cashOnDeliveryAmount: null,
	cashOnDeliveryCurrency: null,
	cashOnDeliveryPaidOutDate: null,

	delivery: {
		date: null,
		timeFrom: null,
		timeTo: null,
		name: null,
		streetAddress: null,
		psc: null,
		city: null,
		state: null,
		contactName: null,
		contactPhone: null,
		note: null,
	},
	pickup: {
		date: null,
		timeFrom: null,
		timeTo: null,
		name: null,
		streetAddress: null,
		psc: null,
		city: null,
		state: null,
		contactName: null,
		contactPhone: null,
	},
});

const selectedParcel = ref();
const setSelectedParcel = (parcel) => (selectedParcel.value = parcel);

/* FILL EDIT FORM WITH COPY OF SELECTED PARCEL EACH TIME EDIT MODE IS STARTED */
/*
	editForm can be also filled in onMounted() after parcels fetch (in BaseParcelsView trough emit),
	because by the time isEditing is true (which is stored in sessionStorage),
	parcels are not fetched yet so editForm would not get filled in this watch()
*/
watch(
	() => editingParcelId.value,
	(isEditing) => {
		if (!isEditing || !selectedParcel.value) return;

		fillEditForm();
	},
);

// fill edit form with copy of selected parcel data
const fillEditForm = () =>
	Object.assign(editForm, mapParcelToForm(selectedParcel.value));

// isEditing is used for BaseParcelView prop that tells it whether to be in edit mode or not
const isEditing = computed(() => {
	if (!selection.value?.length) return false;
	return editingParcelId.value === selection.value[0].id;
});

const editParcel = () => (editingParcelId.value = selection.value[0].id);

function validateEditForm(form) {
	// reset errors
	Object.assign(editFormErrors, createEmptyErrors());

	// WEIGHT
	if (!form.weight)
		editFormErrors.general.weight = "Hmotnost nesmí být nulová.";

	// DELIVERY
	validateAndSetLocationErrors(form.delivery, editFormErrors.delivery);

	// PICKUP
	validateAndSetLocationErrors(form.pickup, editFormErrors.pickup);

	return isEditFormValid();
}

// returns specified errorMsg if the booleanishCheck is TRUE
const setErrorMsgIfTrue = (errorMsg, booleanishCheck) => {
	if (booleanishCheck) return errorMsg ? errorMsg : "Chyba.";
};

const isEditFormValid = () => {
	const formGroups = Object.keys(editFormErrors); // ['general', 'delivery', 'pickup']

	for (const group of formGroups) {
		for (const key in editFormErrors[group]) {
			// loop trough each of the formGroups objects
			// if any of the value (error message) is set -> edit form is not valid
			const value = editFormErrors[group][key];
			if (value) return false;
		}
	}

	// not single error message present -> its valid
	return true;
};

function validateAndSetLocationErrors(locationForm, errors) {
	// DATE
	errors.date = setErrorMsgIfTrue("Datum je povinné.", !locationForm.date);

	// NAME
	errors.name = setErrorMsgIfTrue(
		"Název je povinný.",
		!locationForm.name?.trim(),
	);

	// TIME FROM
	errors.timeFrom = setErrorMsgIfTrue(
		"Čas od je nesprávný.",
		formatParcelTime(locationForm.timeFrom) === null,
	);

	// TIME TO
	errors.timeTo = setErrorMsgIfTrue(
		"Čas do je nesprávný.",
		formatParcelTime(locationForm.timeTo) === null,
	);

	// STREET ADDRESS
	errors.streetAddress = setErrorMsgIfTrue(
		"Ulice a č.p. je povinné.",
		!locationForm.streetAddress?.trim(),
	);

	// CITY
	errors.city = setErrorMsgIfTrue(
		"Město je povinné.",
		!locationForm.city?.trim(),
	);

	// POSTAL CODE
	errors.psc = setErrorMsgIfTrue("PSČ je povinné.", !locationForm.psc?.trim());

	// STATE
	errors.state = setErrorMsgIfTrue(
		"Stát je povinný.",
		!locationForm.state?.trim(),
	);
}

type clearEditFieldErrorParam = {
	section: "general" | "delivery" | "pickup";
	field: string;
};

const handleCancelEdit = () => (editingParcelId.value = null);

const handleClearEditFieldError = (p: clearEditFieldErrorParam) => {
	if (editFormErrors[p.section]?.[p.field]) {
		delete editFormErrors[p.section][p.field];
	}
};

const createEmptyErrors = () => ({
	general: {},
	delivery: {},
	pickup: {},
});

const editFormErrors = reactive({
	general: {}, // palletsCount, palletSpacesCount, weight, temperatureMode, ...
	delivery: {}, // date, timeTo, timeFrom, name, ...
	pickup: {}, // date, timeTo, timeFrom, name, ...
});

const handleUpdateEditFormPickup = (val) => {
	Object.assign(editForm.delivery, val);
};

const handleUpdateEditFormDelivery = (val) => {
	Object.assign(editForm.pickup, val);
};

/* EDIT PARCEL REQUEST */
async function handleSaveEdit(editForm) {
	if (!validateEditForm(editForm)) return;

	const payload = mapEditFormToPayload(editForm);

	// axios api will provide success result object
	// if the request is error 'res' will be undefined, and also 'res.status'
	const res = await api.patch(`/parcels/${editingParcelId.value}`, payload);

	if (res?.status === 200) {
		baseRef.value.refresh();

		const { sequenceNum, billOfLadingNum } = selectedParcel.value;
		const { code } = selectedParcel.value.customer;

		showToast({
			severity: "success",
			summary: "Úprava úspěšná.",
			detail: `Zásilka ${code}${sequenceNum} (${billOfLadingNum}) byla upravena.`,
			life: 4000,
		});

		editingParcelId.value = null;
	}
}

function datePickerToForm(date): Date | null {
	return date ? new Date(date) : null;
}

const mapParcelToForm = (parcel) => {
	return {
		type: parcel.type,
		palletsCount: parcel.palletsCount,
		palletSpacesCount: parcel.palletSpacesCount,
		weight: parcel.weight,
		temperatureMode: parcel.temperatureMode,
		note: parcel.note,

		cashOnDeliveryAmount: parcel.cashOnDelivery?.amount,
		cashOnDeliveryCurrency: parcel.cashOnDelivery?.currencyCode,
		cashOnDeliveryPaidOutDate: datePickerToForm(
			parcel.cashOnDeliveryPaidOutDate,
		),

		delivery: {
			date: parcel.deliveryDate ? new Date(parcel.deliveryDate) : null,
			timeFrom: parcel.deliveryTimeFrom,
			timeTo: parcel.deliveryTimeTo,
			name: parcel.deliveryName,
			streetAddress: parcel.deliveryStreetAddress,
			psc: parcel.deliveryPsc,
			city: parcel.deliveryCity,
			state: parcel.deliveryState,
			contactName: parcel.deliveryContactName,
			contactPhone: parcel.deliveryContactPhone,
			note: parcel.deliveryNote,
		},
		pickup: {
			date: parcel.pickupDate ? new Date(parcel.pickupDate) : null,
			timeFrom: parcel.pickupTimeFrom,
			timeTo: parcel.pickupTimeTo,
			name: parcel.pickupName,
			streetAddress: parcel.pickupStreetAddress,
			psc: parcel.pickupPsc,
			city: parcel.pickupCity,
			state: parcel.pickupState,
			contactName: parcel.pickupContactName,
			contactPhone: parcel.pickupContactPhone,
		},
	};
};

function mapEditFormToPayload(form) {
	const codPaidOutDateOnly = form.cashOnDeliveryPaidOutDate
		? toDateOnlyString(form.cashOnDeliveryPaidOutDate)
		: null;

	return {
		type: form.type,
		palletsCount: form.palletsCount,
		palletSpacesCount: form.palletSpacesCount,
		weight: form.weight,
		temperatureMode: form.temperatureMode,
		note: form.note,

		cashOnDeliveryAmount: form.cashOnDeliveryAmount,
		cashOnDeliveryCurrency: form.cashOnDeliveryCurrency,
		cashOnDeliveryPaidOutDate: codPaidOutDateOnly,

		deliveryDate: toDateOnlyString(form.delivery.date),
		deliveryTimeFrom: formatParcelTime(form.delivery.timeFrom),
		deliveryTimeTo: formatParcelTime(form.delivery.timeTo),
		deliveryName: form.delivery.name,
		deliveryStreetAddress: form.delivery.streetAddress,
		deliveryPsc: formatPscReverse(form.delivery.psc),
		deliveryCity: form.delivery.city,
		deliveryState: form.delivery.state,
		deliveryContactName: form.delivery.contactName,
		deliveryContactPhone: form.delivery.contactPhone,
		deliveryNote: form.delivery.note,

		pickupDate: toDateOnlyString(form.pickup.date),
		pickupTimeFrom: formatParcelTime(form.pickup.timeFrom),
		pickupTimeTo: formatParcelTime(form.pickup.timeTo),
		pickupName: form.pickup.name,
		pickupStreetAddress: form.pickup.streetAddress,
		pickupPsc: formatPscReverse(form.pickup.psc),
		pickupCity: form.pickup.city,
		pickupState: form.pickup.state,
		pickupContactName: form.pickup.contactName,
		pickupContactPhone: form.pickup.contactPhone,
	};
}
/* - EDIT MODE - */
const statusChangingIds = ref();
const isStatusChandingDelayOver = ref<boolean>();
const isStatusChangingForId = (id) => {
	if (!statusChangingIds.value || !isStatusChandingDelayOver.value)
		return false;
	return statusChangingIds.value.includes(id);
};

async function changeStatusOnSelectedParcels(newStatus: ParcelStatusKey) {
	if (!selection.value?.length) return;

	let delayLoading = setTimeout(() => {
		isStatusChandingDelayOver.value = true;
	}, 90);

	statusChangingIds.value = selection.value.map((p) => p.id);
	try {
		const { data } = await api.patch("/parcels/status", {
			parcelIds: statusChangingIds.value,
			newStatus,
		});
	} finally {
		clearTimeout(delayLoading);
		baseRef.value.refresh();
		statusChangingIds.value = null;
		isStatusChandingDelayOver.value = false;
	}
}

async function markProblemOnSelectedParcels(problem: boolean) {
	if (!selection.value?.length) return;

	const { data } = await api.patch("/parcels/problem", {
		parcelIds: selection.value.map((p) => p.id),
		problem,
	});

	baseRef.value?.refresh();
}

async function deleteSelectedParcel() {
	if (!selection.value?.length) return;

	await api.delete("/parcels", { data: { parcelId: selectedParcel.value.id } });

	baseRef.value?.refresh();
}

const confirm = useConfirm();

function confirmSelectedParcelDelete() {
	confirm.require({
		header: "Vymazat zásilku",
		message: `Chystáte se smazat zásilku ${selectedParcel.value.customer.code}${selectedParcel.value.sequenceNum}.\n Číslo dodacího listu: ${selectedParcel.value.billOfLadingNum}.\n Jste si jistí?`,
		acceptLabel: "Ano, smazat!",
		rejectLabel: "Ne, ponechát.",
		accept: () => deleteSelectedParcel(),
	});
}

/* single */
const isSelectedParcelBilled = computed(() => {
	return Boolean(selectedParcel.value?.billingItem);
});

/* single */
const isSelectedParcelBilledExternally = computed(() => {
	return Boolean(selectedParcel.value?.invoicedExternallyAt);
});

/* single */
const isSelectedParcelCancelled = computed(() => {
	return Boolean(selectedParcel.value?.status === "CANCELLED");
});

/* multi */
const hasAnyInternallyInvoicedSelected = computed(() => {
	return selection.value?.some((p) => Boolean(p.billingItem));
});

/* multi */
const hasAnyExternallyInvoicedSelected = computed(() => {
	return selection.value.some((p) => Boolean(p.invoicedExternallyAt));
});

/* multi */
const hasAnyCancelledSelected = computed(() => {
	return selection.value.some((p) => Boolean(p.status === "CANCELLED"));
});

const statusMenuItems = computed(() => {
	const statuses = Object.values(parcelStatus);

	// show only 'DELIVERED' option if selected parcel is in billingItem
	const allowedStatuses = isSelectedParcelBilled.value
		? statuses.filter((s) => s.state === "DELIVERED")
		: statuses;

	return allowedStatuses.map((s) => ({
		label: s.label,
		statusState: s.state,
		statusIcon: s.icon,
		command: () => changeStatusOnSelectedParcels(s.state),
	}));
});

const singleMenu = computed(() => [
	{
		label: "Změnit stav",
		tablerIcon: IconStatusChange,
		items: statusMenuItems.value,
	},
	{ separator: true },
	{
		label: "Upravit",
		tablerIcon: IconEdit,
		command: () => editParcel(),
		disabled: isSelectedParcelBilled.value,
	},

	{
		label: selectedParcel.value?.problem ? "Zrušit neshodu" : "Označit neshodu",
		tablerIcon: selectedParcel.value?.problem
			? IconAlertTriangleOff
			: IconAlertTriangle,
		warnColor: true,
		command: () => {
			if (selectedParcel.value?.problem) markProblemOnSelectedParcels(false);
			else markProblemOnSelectedParcels(true);
		},
	},
	{
		label: isSelectedParcelBilledExternally.value
			? "Odebrat ext. fakturaci"
			: "Označit ext. fakturaci",
		tablerIcon: isSelectedParcelBilledExternally.value
			? IconLockOpen
			: IconLock,
		warnColor: true,
		command: () => {
			if (isSelectedParcelBilledExternally.value) {
				setInvoicedExternally("off");
			} else {
				setInvoicedExternally("on");
			}
		},
		disabled: isSelectedParcelBilled.value || isSelectedParcelCancelled.value,
	},
	{ separator: true },
	{
		label: "Smazat",
		tablerIcon: IconTrash,
		deleteColor: true,
		command: () => confirmSelectedParcelDelete(),
		disabled: isSelectedParcelBilled.value,
	},
]);

const multiMenu = computed(() => [
	{
		label: "Zmenit stav",
		tablerIcon: IconStatusChange,
		items: statusMenuItems.value,
	},
	{
		label: hasAnyExternallyInvoicedSelected.value
			? "Odebrat ext. fakturaci"
			: "Označit ext. fakturaci",
		tablerIcon: hasAnyExternallyInvoicedSelected.value
			? IconLockOpen
			: IconLock,
		disabled:
			(!hasAnyExternallyInvoicedSelected.value &&
				hasAnyInternallyInvoicedSelected.value) ||
			hasAnyCancelledSelected.value,
		command: () => {
			if (hasAnyExternallyInvoicedSelected.value) {
				setInvoicedExternally("off");
			} else {
				setInvoicedExternally("on");
			}
		},
	},
]);

const menuModel = computed(() =>
	selection.value?.length > 1 ? multiMenu.value : singleMenu.value,
);

function onRowContextMenu(event) {
	const rightClickedParcel = event.data;

	// parcel is selected when the right-clicked parcel is contained in the selected parcels
	const isSelected =
		Array.isArray(selection.value) &&
		selection.value.some((item) => item.id === rightClickedParcel.id);

	// if the right-clicked parcel is not selected, then select the one right-clicked for better UX
	if (!isSelected) selection.value = [rightClickedParcel];

	cm.value.show(event.originalEvent);
}

/* INVOICED EXTERNTALLY AT */
async function setInvoicedExternally(setTo: "on" | "off") {
	if (!selection.value?.length) return;

	const { data } = await api.patch("/parcels/invoiced-externally", {
		parcelIds: selection.value.map((p) => p.id),
		setTo,
	});

	await baseRef.value?.refresh();
}

/* CUSTOMER FILTER */
const filterCustomer = ref(
	useSessionStorage(`${stateKey}.customer`, undefined),
);

/* STATEFUL TABLE SESSION KEY */
const stateKey = "g4pl-provider-parcels";
</script>

<template>
	<GBaseParcelsView
		ref="baseRef"
		mode="provider"
		v-model:selection="selection"
		:editForm="editForm"
		:isEditing="isEditing"
		:editFormErrors="editFormErrors"
		@singleParcelSelection="setSelectedParcel"
		@cancelEdit="handleCancelEdit"
		@saveEdit="handleSaveEdit"
		@fillEditForm="fillEditForm"
		@clearEditFieldError="handleClearEditFieldError"
		@rowContextMenu="onRowContextMenu"
		:stateKey="stateKey"
		multiple
		:filterCustomer="filterCustomer"
	>
		<template #headerFilters>
			<InputText
				v-model="filterCustomer"
				id="parcels-customer-filter"
				label="Zákazník"
				:icon="IconUsers"
				useClear
			/>
		</template>

		<template #columnsStart="{ parcelStatus }">
			<Column field="customer.code" header="Zkr." class="font-semibold" />
			<Column header="Číslo DL" class="z-1" frozen>
				<template #body="{ data }">
					<div class="flex items-center gap-1">
						<!-- BILLED IN THE SYSTEM -->
						<IconLock
							v-if="data.billingItem"
							size="14"
							class="text-primary"
							v-tooltip="{
								value: 'Zásilka je součástí automatické fakturace systému.',
								showDelay: 500,
							}"
						/>

						<!-- BILLED EXTERNALLY -->
						<div
							v-if="data.invoicedExternallyAt"
							class="flex items-center text-amber-600"
							v-tooltip="{
								value:
									'Zásilka byla označena jako fakturovaná mimo systém. Nebude zahrnuta do automatické fakturace.',
								showDelay: 500,
							}"
						>
							<IconLock size="14" />
							ext
						</div>

						<!-- BILL OF LADING NUMBER -->
						<span class="font-medium">
							{{ data.billOfLadingNum ?? "-" }}
						</span>
					</div>
				</template>
			</Column>
			<Column header="Stav">
				<template #body="{ data }">
					<Tag
						:icon="parcelStatus[data.status].icon"
						:label="parcelStatus[data.status].label"
						:status="data.status"
						:loading="isStatusChangingForId(data.id)"
					/>
				</template>
			</Column>
		</template>

		<template #lastDetailsField>
			<!-- PROVIDER NOTE (EDITABLE IN EDIT MODE) -->
			<FormField title="Vaše poznámka" compact>
				<template #details>
					<LinkifiedText
						v-if="!isEditing && selectedParcel?.note"
						:text="selectedParcel.note"
					/>

					<Textarea
						v-else-if="isEditing"
						v-model="editForm.note"
						id="g4pl_parcel_note"
						fluid
						class="text-sm rounded-lg"
					/>

					<span v-else class="text-xs">
						Přidat poznámku můžete upravením zásilky.
					</span>
				</template>
			</FormField>
		</template>

		<template #contextMenu>
			<ContextMenu
				ref="cm"
				:model="menuModel"
				:pt="{
					root: 'text-sm rounded-lg',
					itemContent: 'bg-transparent',
				}"
			>
				<template #item="{ item, props }">
					<div
						:class="[
							'flex items-center gap-3 px-3 py-1.5 rounded-lg',
							item.command ? 'cursor-pointer' : 'cursor-default',
							item.warnColor
								? 'hover:bg-amber-100'
								: item.deleteColor
									? 'hover:bg-red-100'
									: 'hover:bg-zinc-100',
						]"
					>
						<!-- icon -->
						<component v-if="item.tablerIcon" :is="item.tablerIcon" size="16" />

						<!-- status submenu -->
						<Tag
							v-if="item.statusState"
							:icon="item.statusIcon"
							:label="item.label"
							:status="item.statusState"
						/>

						<!-- label -->
						<span v-else class="mr-auto">{{ item.label }}</span>

						<!-- chevron icon if item has items -->
						<IconChevronRight
							v-if="item.items"
							size="14"
							class="text-slate-500"
						/>
					</div>
				</template>
			</ContextMenu>
		</template>
	</GBaseParcelsView>
</template>
