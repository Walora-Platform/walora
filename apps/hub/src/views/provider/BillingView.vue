<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import {
	ref,
	watch,
	onMounted,
	reactive,
	provide,
	computed,
	nextTick,
} from "vue";
import api from "@/api/base";
import { formatDate, formatPsc } from "@/utils/formatString";
import { downloadFileFromResponse } from "@/utils/downloadFile";
import {
	billingBatchStatus,
	billingBatchError,
	billingItemError,
} from "@/config/billingStatus";
import { parcelStatus } from "@/config/parcelStatus";

import {
	IconReportSearch,
	IconX,
	IconAlertTriangle,
	IconAlertCircle,
	IconPencil,
	IconCheck,
	IconLockCheck,
	IconLockOpen2,
	IconReload,
	IconTableExport,
	IconFileInvoice,
	IconLoader2,
} from "@tabler/icons-vue";

import Column from "primevue/column";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import { useConfirm } from "primevue/useconfirm";
import { showToast } from "@/services/toast";

const confirm = useConfirm();

const invoices = ref([]);
const totalRecords = ref(0);
const pageSizeOptions = [20, 40, 60];

const selectedInvoice = ref(null);
const contextMenuSelection = ref(null);
const expandedRows = ref();

const query = reactive({
	page: 0,
	pageSize: pageSizeOptions[0],
});

const closeInvoiceDetail = () => {
	fetchInvoices();
	selectedInvoice.value = null;
};

const openInvoiceDetail = async () => {
	selectedInvoice.value = contextMenuSelection.value;
	contextMenuSelection.value = null;

	await fetchSelectedInvoiceDetail();
};

async function fetchInvoices() {
	const r = await api.get("/billing/batches", { params: query });
	if (r?.status === 200) {
		invoices.value = r.data.data;
		totalRecords.value = r.data.total;
	}
}

async function fetchInvoicesPage({ page, pageSize }) {
	query.page = page;
	query.pageSize = pageSize;
	await fetchInvoices();
}

const onPageChange = (pageObject) => fetchInvoicesPage(pageObject);

async function fetchSelectedInvoiceDetail() {
	const r = await api.get(`/billing/batches/${selectedInvoice.value.id}`);
	if (r?.status === 200) {
		const { items, batch } = r.data;

		selectedInvoice.value = batch;
		selectedInvoice.value.items = items;
	}
}

const contextMenu = ref();
const onContextMenu = (event) =>
	contextMenu.value.openMenu(event.originalEvent);

const isSelectedInvoiceFinalized = computed(() => {
	if (!contextMenuSelection.value) return null;

	return contextMenuSelection.value.status === "FINALIZED";
});

const menuConfig = computed(() => [
	{
		label: "Zobrazit",
		tablerIcon: IconReportSearch,
		command: () => openInvoiceDetail(),
	},
	{
		label: "Přepočítat",
		tablerIcon: IconReload,
		disabled: isSelectedInvoiceFinalized.value,
		command: () =>
			confirmRecalculateBillingBatch(contextMenuSelection.value.id),
	},
	{ separator: true },
	{
		label: isSelectedInvoiceFinalized.value
			? "Znovu otevřít fakturu"
			: "Uzavřít fakturu",
		tablerIcon: isSelectedInvoiceFinalized.value
			? IconLockOpen2
			: IconLockCheck,
		command: () => {
			confirmChangeStatusOnSelected(
				isSelectedInvoiceFinalized.value ? "DRAFT" : "FINALIZED",
			);
		},
	},
]);

/* RECALCULATE BILLING BATCH */
async function recalculateBillingBatch(id) {
	if (!id) return;

	const res = await api.post(`/billing/batches/${id}/recalculate`);

	if (res?.data?.deleted === true) {
		showToast({
			severity: "error",
			summary: "Dávka byla odstráněna",
			detail: "Fakturační dávka už neobsahuje žádne zásilky k fakturaci.",
			life: 5000,
		});

		await fetchInvoices();
		closeInvoiceDetail();
	}

	if (res?.data?.deleted === false) {
		showToast({
			severity: "success",
			summary: "Požadavek úspěšne vybaven",
			detail: "Fakturační dávka byla přepočítána",
			life: 5000,
		});

		await fetchInvoices();

		if (selectedInvoice.value) {
			await fetchSelectedInvoiceDetail();
		}
	}
}

function confirmRecalculateBillingBatch(id) {
	if (!id) return;

	confirm.require({
		header: "Přepočítat fakturační dávku",
		message:
			"Dávka bude znovu vypočítána podle aktuálního tarifu. Do dávky se znovu zahrnou odpovídající zásilky do konce období. Ručně upravené ceny budou přepsány. Opravdu chcete pokračovat?",
		acceptLabel: "Ano, přepočítat!",
		rejectLabel: "Ne, ponechát.",
		accept: () => recalculateBillingBatch(id),
	});
}

/* CHANGE BILLING BATCH STATUS */
async function changeBillingBatchStatus(id, status) {
	const r = await api.patch(`/billing/batches/${id}/status`, {
		status,
	});

	if (r?.status === 200) {
		await fetchInvoices();
	}
}

function confirmChangeStatusOnSelected(status) {
	const id = contextMenuSelection.value?.id;
	if (!status || !id) return;

	if (status === "FINALIZED") {
		const hasErrors = contextMenuSelection.value?.hasErrors;
		const customerCode = contextMenuSelection.value.customerCompany?.code;

		const errorsNote = hasErrors
			? " Zkontrolujte, zda fakturační dávka neobsahuje chyby ve výpočtu."
			: "";

		// always confirm - closing the batch automatically sends the invoice
		// number and invoiced zásilky to Smart4Web ERP
		confirm.require({
			header: "Uzavřít fakturu",
			message: `Fakturační dávka zákazníka ${customerCode} bude uzavřena a číslo faktury spolu se zásilkami se automaticky odešle do Smart4Web ERP.${errorsNote} Dávku bude možné později znovu otevřít. Opravdu ji chcete uzavřít?`,
			acceptLabel: "Ano, uzavřít!",
			rejectLabel: "Ne, zatím neuzavírat.",
			accept: () => changeBillingBatchStatus(id, status),
		});
	} else {
		// DRAFT - change without need to confirm
		changeBillingBatchStatus(id, status);
	}

	return;
}

/* REMOVE PARCEL FROM BILLING ITEM */
const canRemoveParcel = computed(
	() => selectedInvoice.value.status !== "FINALIZED",
);

function confirmRemoveParcelFromBillingItem(
	id: string,
	billOfLadingNum: string,
) {
	confirm.require({
		header: "Odebrat zásilku",
		message: `Zásilka '${billOfLadingNum}' bude odebrána z fakturační položky a bude moct byt zahrnuta v následující fakturaci. Jste si jistí?`,
		acceptLabel: "Ano, odebrat!",
		rejectLabel: "Ne, ponechát.",
		accept: () => {
			removeParcelFromBillingItem(id);
		},
	});
}

async function removeParcelFromBillingItem(parcelId: string) {
	if (!parcelId) return;

	const r = await api.patch(
		`/billing/parcels/${parcelId}/remove-from-billing-item`,
	);

	if (r?.status === 200) {
		if (r.data.removedBillingBatchId) {
			closeInvoiceDetail();
			return;
		}

		await fetchSelectedInvoiceDetail();
	}
}

/* EXPORT BILLING BATCH */
const exportBillingBatchLoading = ref();

async function exportBillingBatch() {
	if (!selectedInvoice.value) return;

	exportBillingBatchLoading.value = true;

	try {
		const res = await api.get(
			`/billing/batches/${selectedInvoice.value.id}/export`,
			{ responseType: "blob" },
		);

		downloadFileFromResponse(res);
	} finally {
		exportBillingBatchLoading.value = false;
	}
}

/* EDIT ITEM FINAL PRICE */
const editingBillingItemPriceId = ref(null);
const editedFinalPrice = ref(null);

function startEditBillingItemPrice(item: any) {
	editingBillingItemPriceId.value = item.id;
	editedFinalPrice.value = Number(item.finalPrice);
}

function cancelEditBillingItemPrice() {
	editingBillingItemPriceId.value = null;
	editedFinalPrice.value = null;
}

const canSaveBillingItemPrice = computed(() => {
	return (
		editingBillingItemPriceId.value !== null &&
		editedFinalPrice.value !== null &&
		editedFinalPrice.value >= 0
	);
});

async function saveBillingItemFinalPrice(item: any) {
	if (!canSaveBillingItemPrice.value) return;

	const r = await api.patch(`/billing/items/${item.id}/final-price`, {
		finalPrice: editedFinalPrice.value,
	});

	if (r?.status === 200) {
		cancelEditBillingItemPrice();
		await fetchSelectedInvoiceDetail();
	}
}

/* EDIT INVOICE NUMBER */
const editingInvoiceNumber = ref(false);
const editedInvoiceNumber = ref("");
const savingInvoiceNumber = ref(false);

function startEditInvoiceNumber() {
	editingInvoiceNumber.value = true;
	editedInvoiceNumber.value = selectedInvoice.value?.invoiceNumber ?? "";
}

function cancelEditInvoiceNumber() {
	editingInvoiceNumber.value = false;
	editedInvoiceNumber.value = "";
}

const canSaveInvoiceNumber = computed(() => {
	return (
		editingInvoiceNumber.value && editedInvoiceNumber.value.trim().length > 0
	);
});

async function saveInvoiceNumber() {
	if (!canSaveInvoiceNumber.value) return;

	savingInvoiceNumber.value = true;

	try {
		const r = await api.patch(
			`/billing/batches/${selectedInvoice.value.id}/invoice-number`,
			{ invoiceNumber: editedInvoiceNumber.value.trim() },
		);

		if (r?.status === 200) {
			cancelEditInvoiceNumber();
			await fetchSelectedInvoiceDetail();
		}
	} finally {
		savingInvoiceNumber.value = false;
	}
}

/* BILLING BATCH PRICE WARNING */
const showBillingBatchPriceWarning = (hasErrors, errorCode, status) => {
	if (status !== "FINALIZED" && (hasErrors || errorCode)) return true;
	return false;
};

onMounted(() => fetchInvoices());
provide("fieldWidth", "48");
</script>

<template>
	<CardTransitionWrapper class="flex-1">
		<Card v-if="!selectedInvoice">
			<CardHeader
				title="Vytvořené faktury"
				subtitle="Vaše automaticky vypočteny fakturační podklady"
			/>

			<Table
				:value="invoices"
				:rowsPerPageOptions="pageSizeOptions"
				:totalRecords="totalRecords"
				v-model:contextMenuSelection="contextMenuSelection"
				@pageChange="onPageChange"
				@contextMenu="onContextMenu"
				contextMenuSelectionMode
				paginator
				onlyShow
			>
				<ContextMenu
					ref="contextMenu"
					@hide="contextMenuSelection = null"
					:items="menuConfig"
				/>
				<Column header="Zákazník">
					<template #body="{ data }">
						<span class="font-medium">
							{{ data.customerCompany.name }}
						</span>
					</template>
				</Column>
				<Column header="Zkr." field="customerCompany.code" />
				<Column header="Za období">
					<template #body="{ data }">
						{{ formatDate(data.periodFrom).date }} -
						{{ formatDate(data.periodTo).date }}
					</template>
				</Column>
				<Column header="Cena">
					<template #body="{ data }">
						<span
							class="inline-flex items-center gap-1.5"
							v-tooltip="{
								value: showBillingBatchPriceWarning(
									data.hasErrors,
									data.errorCode,
									data.status,
								)
									? 'Cena nezahrnuje všechny přepravy kvůli chybám při výpočtu'
									: '',
								showDelay: 500,
							}"
						>
							<IconAlertTriangle
								v-if="
									showBillingBatchPriceWarning(
										data.hasErrors,
										data.errorCode,
										data.status,
									)
								"
								size="16"
								class="text-red-600"
							/>

							<Price :value="data.totalPrice" currency="Kč" />
						</span>
					</template>
				</Column>
				<Column header="Stav">
					<template #body="{ data }">
						<Tag
							:label="billingBatchStatus[data.status].label"
							:status="billingBatchStatus[data.status].status"
							:icon="billingBatchStatus[data.status].icon"
						/>
					</template>
				</Column>

				<Column header="Chyby výpočtu">
					<template #body="{ data }">
						<Tag
							v-if="data.errorCode"
							:label="billingBatchError[data.errorCode].label"
							:status="billingBatchError[data.errorCode].status"
							:icon="billingBatchError[data.errorCode].icon"
						/>
						<Tag
							v-else-if="!data.errorCode && data.hasErrors"
							label="Neúplné ceny"
							status="INACTIVE"
							:icon="IconAlertTriangle"
							v-tooltip="{
								value:
									'Při výpočtu cen došlo k chybě u jedné nebo více zásilek',
								showDelay: 500,
							}"
						/>
					</template>
				</Column>

				<Column header="Datum uzavřetí">
					<template #body="{ data }">
						{{ formatDate(data.finalizedAt).date }}
						<SubText>{{ formatDate(data.finalizedAt).time }}</SubText>
					</template>
				</Column>
				<Column header="Datum vytvoření">
					<template #body="{ data }">
						{{ formatDate(data.createdAt).date }}
						<SubText>{{ formatDate(data.createdAt).time }}</SubText>
					</template>
				</Column>
				<Column header="Počet zásilek">
					<template #body="{ data }">
						<span
							v-tooltip="{ value: 'Celkový počet zásilek', showDelay: 500 }"
						>
							{{ data.totalParcels }}
						</span>
					</template>
				</Column>

				<Column header="Počet lož. míst" field="totalPalletSpaces" />
			</Table>
		</Card>

		<Card v-else>
			<CardHeader
				title="Fakturační batch"
				subtitle="Informace o zvolené dávce a jejích položkách"
			>
				<div
					:class="[
						'flex h-8.5 items-center gap-1 rounded-xl border border-slate-200',
						selectedInvoice?.status === 'FINALIZED' ? 'p-3' : 'pl-3 pr-1',
					]"
				>
					<template v-if="!editingInvoiceNumber">
						<IconFileInvoice size="16" class="shrink-0 text-slate-400" />

						<span
							v-if="selectedInvoice?.invoiceNumber"
							class="text-sm whitespace-nowrap"
						>
							<span class="text-slate-400">Č. faktury:</span>
							<span class="ml-1 font-semibold text-slate-800">
								{{ selectedInvoice?.invoiceNumber }}
							</span>
						</span>
						<span v-else class="text-sm text-gray-400 whitespace-nowrap">
							Číslo faktury nezadáno
						</span>
						<button
							v-if="selectedInvoice?.status !== 'FINALIZED'"
							type="button"
							class="flex size-6 items-center justify-center rounded-lg text-primary transition hover:bg-primary/10 cursor-pointer"
							@click="startEditInvoiceNumber()"
							v-tooltip.top="{
								value: 'Zadat číslo faktury z MoneyS3',
								showDelay: 500,
							}"
						>
							<IconPencil size="14" />
						</button>
					</template>

					<template v-else>
						<InputText
							v-model="editedInvoiceNumber"
							unstyled
							class="w-32 text-sm outline-none"
							:disabled="savingInvoiceNumber"
							autofocus
							placeholder="Číslo faktury"
							@keyup.enter.exact="saveInvoiceNumber()"
							@keyup.esc.exact="cancelEditInvoiceNumber()"
						/>
						<button
							type="button"
							:disabled="!canSaveInvoiceNumber || savingInvoiceNumber"
							:class="[
								'flex size-6 items-center justify-center rounded-lg transition cursor-pointer',
								canSaveInvoiceNumber && !savingInvoiceNumber
									? 'text-primary hover:bg-primary/10'
									: 'text-slate-300 cursor-not-allowed',
							]"
							@click="saveInvoiceNumber()"
							v-tooltip.top="{ value: 'Uložit číslo faktury', showDelay: 500 }"
						>
							<IconLoader2
								v-if="savingInvoiceNumber"
								size="16"
								class="animate-spin"
							/>
							<IconCheck v-else size="16" />
						</button>
						<button
							type="button"
							:disabled="savingInvoiceNumber"
							class="flex size-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
							@click="cancelEditInvoiceNumber()"
							v-tooltip.top="{ value: 'Zrušit úpravu', showDelay: 500 }"
						>
							<IconX size="16" />
						</button>
					</template>
				</div>

				<Button
					@click="confirmRecalculateBillingBatch(selectedInvoice.id)"
					class="h-8.5"
					v-tooltip.top="{
						value: 'Nechat systém znovu přepočítat celou fakturační dávku.',
						showDelay: 500,
					}"
				>
					<IconReload size="16" />
					Přepočítat
				</Button>

				<Button
					@click="exportBillingBatch()"
					:loading="exportBillingBatchLoading"
					class="h-8.5"
					v-tooltip.top="{
						value: 'Vygenerovat export této fakturace ve formátu XLSX.',
						showDelay: 500,
					}"
				>
					<IconTableExport size="16" />
					Export dat
				</Button>

				<Button
					@click="closeInvoiceDetail"
					variant="outlined"
					v-tooltip.top="{ value: 'Zavřít', showDelay: 500 }"
				>
					<IconX size="16" />
				</Button>
			</CardHeader>

			<div class="flex w-full mb-4 mt-2.5">
				<div class="flex-1">
					<!-- CUSTOMER -->
					<FormField title="Zákazník" compact>
						<span class="font-medium text-lg">
							{{ selectedInvoice?.customerCompany?.name }}
							<span class="text-sm font-normal text-gray-500">
								{{ selectedInvoice?.customerCompany?.code }}
							</span>
						</span>
					</FormField>

					<!-- BILLING PERIOD FROM-TO -->
					<FormField title="Fakturační období" compact>
						<div class="leading-[1.92]">
							{{ formatDate(selectedInvoice?.periodFrom).date }}
							- {{ formatDate(selectedInvoice?.periodTo).date }}
						</div>
					</FormField>

					<!-- PARCELS COUNT -->
					<FormField title="Počet zásilek" compact>
						{{ selectedInvoice?.totalParcels }}
					</FormField>

					<!-- BILLING ITEMS COUNT -->
					<FormField title="Počet zásilek po sloučení" compact>
						{{ selectedInvoice?.items?.length }}
					</FormField>

					<!-- PALLETS COUNT + PALLET SPACES COUNT -->
					<div class="flex">
						<FormField title="Počet palet" compact class="flex-1">
							{{ selectedInvoice?.totalPallets }}
						</FormField>

						<FormField title="Počet ložních míst" compact class="flex-1">
							{{ selectedInvoice?.totalPalletSpaces }}
						</FormField>
					</div>
				</div>
				<div class="flex-1">
					<!-- TOTAL PRICE -->
					<FormField title="Celková cena" compact>
						<div class="flex items-center gap-2">
							<IconAlertTriangle
								v-if="selectedInvoice?.hasErrors || selectedInvoice?.errorCode"
								size="16"
								class="text-red-600"
							/>

							<Price
								:value="selectedInvoice?.totalPrice"
								currency="Kč"
								class="font-medium text-lg"
								:class="
									selectedInvoice?.hasErrors || selectedInvoice?.errorCode
										? 'leading-6'
										: 'leading-7'
								"
							/>
						</div>
					</FormField>

					<!-- STATUS -->
					<FormField title="Stav" compact>
						<Tag
							:label="billingBatchStatus[selectedInvoice?.status].label"
							:status="billingBatchStatus[selectedInvoice?.status].status"
							:icon="billingBatchStatus[selectedInvoice?.status].icon"
						/>
					</FormField>

					<!-- FINALIZED AT -->
					<FormField title="Datum uzavření" compact>
						<span v-if="selectedInvoice?.finalizedAt">
							{{ formatDate(selectedInvoice?.finalizedAt).date }}
						</span>
						<span v-else class="text-transparent">-</span>
					</FormField>

					<!-- USED TARIFF'S NAME -->
					<FormField title="Název tarifu" compact>
						<span v-if="selectedInvoice?.tariff?.name">
							{{ selectedInvoice?.tariff?.name }}
						</span>
						<span v-else class="text-transparent">-</span>
					</FormField>

					<!-- CREATED AT -->
					<FormField title="Datum vytvoření" compact>
						{{ formatDate(selectedInvoice?.createdAt).date }}
						<SubText>{{ formatDate(selectedInvoice?.createdAt).time }}</SubText>
					</FormField>
				</div>
			</div>

			<Table
				:value="selectedInvoice?.items"
				v-model:expandedRows="expandedRows"
				onlyShow
			>
				<Column expander></Column>
				<Column header="Finální cena">
					<template #body="{ data }">
						<div class="flex items-center gap-2">
							<template v-if="editingBillingItemPriceId === data.id">
								<InputNumber
									v-model="editedFinalPrice"
									mode="decimal"
									:min="0"
									:minFractionDigits="0"
									:maxFractionDigits="2"
									size="small"
									inputClass="w-28 text-right"
									@keyup.enter.exact="saveBillingItemFinalPrice(data)"
									@keyup.esc.exact="cancelEditBillingItemPrice()"
								/>
								<button
									type="button"
									:disabled="!canSaveBillingItemPrice"
									:class="[
										'flex size-6 items-center justify-center rounded-lg transition cursor-pointer',
										canSaveBillingItemPrice
											? 'text-primary hover:bg-primary/10'
											: 'text-slate-300 cursor-not-allowed',
									]"
									@click.stop="saveBillingItemFinalPrice(data)"
									v-tooltip="{ value: 'Uložit cenu', showDelay: 500 }"
								>
									<IconCheck size="16" />
								</button>
								<button
									class="flex size-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
									@click.stop="cancelEditBillingItemPrice"
									v-tooltip="{ value: 'Zrušit úpravu', showDelay: 500 }"
								>
									<IconX size="16" />
								</button>
							</template>

							<template v-else>
								<span class="font-medium">
									<Price :value="data.finalPrice" currency="Kč" />
								</span>
								<button
									v-if="selectedInvoice?.status !== 'FINALIZED'"
									class="flex size-6 items-center justify-center rounded-lg transition cursor-pointer"
									:class="
										data.finalPriceOverridden
											? 'text-amber-600 hover:bg-amber-600/10'
											: 'text-primary hover:bg-primary/10'
									"
									@click="startEditBillingItemPrice(data)"
									v-tooltip="{
										value: `Upravit finální cenu. \n${data.finalPriceOverridden ? 'Cena již byla upravena.' : 'Cena jěště nebyla upravena.'}`,
										showDelay: 500,
									}"
								>
									<IconPencil size="14" />
								</button>
							</template>
						</div>
					</template>
				</Column>
				<Column header="Tarifní cena">
					<template #body="{ data }">
						<span v-if="Number(data.tariffPrice) !== 0">
							<Price :value="data.tariffPrice" currency="Kč" />
						</span>
					</template>
				</Column>
				<Column header="Cena/lož. místo">
					<template #body="{ data }">
						<span v-if="data.pricePerPallet">
							<Price :value="data.pricePerPallet" currency="Kč" />
						</span>
					</template>
				</Column>

				<Column header="Lož. místa" field="palletSpacesSum" />
				<Column header="Palety" field="palletsSum" />

				<Column header="Zásilky">
					<template #body="{ data }">{{ data.parcels.length }}</template>
				</Column>

				<Column header="Chyba">
					<template #body="{ data }">
						<Tag
							v-if="data.errorCode"
							:label="billingItemError[data.errorCode].label"
							:status="billingItemError[data.errorCode].status"
							:icon="billingItemError[data.errorCode].icon"
						/>
					</template>
				</Column>

				<!-- WARNINGS -->
				<Column header="Upozornění">
					<template #body="{ data }">
						<div class="flex gap-1 flex-wrap">
							<!-- billingItem containes parcels with problem -->
							<Tag
								v-if="data.warnings.problemCount"
								variant="PROBLEM"
								:label="`Neshoda ${data.warnings.problemCount}x`"
								:icon="IconAlertCircle"
							/>

							<!-- billingItem containes undelivered parcels (status not DELIVERED) -->
							<Tag
								v-if="data.warnings.undeliveredCount"
								variant="PROBLEM"
								:label="`Stav doručeno chybí ${data.warnings.undeliveredCount}x`"
								:icon="IconAlertCircle"
							/>

							<!-- billingItem contains parcels with 0 palletSpacesCount -->
							<Tag
								v-if="Number(data.palletSpacesSum) === 0"
								variant="PROBLEM"
								label="Počet lož. míst 0"
								:icon="IconAlertCircle"
							/>
						</div>
					</template>
				</Column>

				<Column header="Zóna">
					<template #body="{ data }">
						<Tag
							v-if="data.zoneLabel"
							:label="data.zoneLabel"
							variant="PLANNED"
						/>
					</template>
				</Column>
				<Column header="Vykládka PSČ">
					<template #body="{ data }">
						{{ formatPsc(data.deliveryPsc) }}
					</template>
				</Column>

				<template #expansion="{ data }">
					<Table :value="data?.parcels" onlyShow>
						<Column v-if="canRemoveParcel">
							<template #body="{ data: parcel }">
								<button
									type="button"
									class="flex size-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-100 hover:text-red-600 cursor-pointer"
									v-tooltip="{
										value: 'Odebrat zásilku z fakturační položky',
										showDelay: 700,
									}"
									@click.stop="
										confirmRemoveParcelFromBillingItem(
											parcel.id,
											parcel.billOfLadingNum,
										)
									"
								>
									<IconX size="14" />
								</button>
							</template>
						</Column>
						<Column header="Číslo DL" field="billOfLadingNum">
							<template #body="{ data }">
								<span class="font-medium">{{ data.billOfLadingNum }}</span>
							</template>
						</Column>
						<Column header="Stav">
							<template #body="{ data }">
								<Tag
									:icon="parcelStatus[data.status].icon"
									:label="parcelStatus[data.status].label"
									:status="data.status"
								/>
							</template>
						</Column>
						<Column header="Lož. místa" field="palletSpacesCount" />
						<Column header="Palety" field="palletsCount" />
						<Column header="Váha">
							<template #body="{ data }">{{ data.weight }} kg</template>
						</Column>
						<Column header="Teplotní režim" field="temperatureMode" />
						<Column header="Datum objednání">
							<template #body="{ data }">
								{{ formatDate(data.createdAt).date }}
							</template>
						</Column>
						<Column header="Datum nakládky">
							<template #body="{ data }">
								{{ formatDate(data.pickupDate).date }}
							</template>
						</Column>
						<Column header="Datum vykládky">
							<template #body="{ data }">
								{{ formatDate(data.deliveryDate).date }}
							</template>
						</Column>
						<Column header="Vykládka název" field="deliveryName" />
						<Column header="Vykládka ulice" field="deliveryStreetAddress" />
						<Column header="Vykládka město" field="deliveryCity" />
						<Column header="Vykládka PSČ a stát">
							<template #body="{ data }">
								{{ formatPsc(data.deliveryPsc) }} ({{ data.deliveryState }})
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
				</template>
			</Table>
		</Card>
	</CardTransitionWrapper>
</template>
