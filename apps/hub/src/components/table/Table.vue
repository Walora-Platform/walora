<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { ref, watch } from "vue";
import DataTable from "primevue/datatable";
import Skeleton from "primevue/skeleton";
import {
	IconLoader2,
	IconChevronLeft,
	IconChevronRight,
	IconChevronDown,
	IconChevronLeftPipe,
	IconChevronRightPipe,
} from "@tabler/icons-vue";

const props = defineProps<{
	value: unknown[];
	totalRecords?: number;
	multiple?: boolean;
	paginator?: boolean;
	rowsPerPageOptions?: number[];
	onlyShow?: boolean;
	contextMenuSelectionMode?: boolean;
}>();

const selection = defineModel("selection");
const contextMenuSelection = defineModel("contextMenuSelection");
const expandedRows = defineModel("expandedRows");

const sortField = defineModel("sortField", {
	default: undefined,
});

// asc = 1; desc = -1
const sortOrder = defineModel("sortOrder", {
	default: undefined,
});

const rowsPerPageOptions = props.rowsPerPageOptions ?? [50, 100, 150];
const rowsPerPage = ref(rowsPerPageOptions[0]);

const emit = defineEmits([
	"pageChange",
	"stateRestore",
	"sortChange",
	"contextMenu",
]);

// user changes page, emits pageChange
function onPage(event: any) {
	emit("pageChange", {
		page: event.page, // 0-based page index
		pageSize: event.rows, // rows per page
	});
}

function onRowsPerPageChange() {
	onPage({
		page: 0,
		rows: rowsPerPage.value,
	});
}

function onSort(event: any) {
	emit("sortChange", {
		page: 0,
		pageSize: event.rows,
	});
}

// state is restored from session
function onStateRestore(state: any) {
	emit("stateRestore", {
		page: Math.floor(state.first / state.rows), // 0-based page index
		pageSize: state.rows, // rows per page
	});
}

function entriesWordFor(value: number) {
	if (value === 1) return "záznam";
	if (value > 1 && value < 5) return "záznamy";
	else return "záznamů";
}

// better UX with metaKeySelection mode
// for unselecting the only one selected parcel (without need to hold metaKey)
function onSelectionChange(newSelection) {
	if (!props.multiple) return;

	const isOldSelectionSingle =
		Array.isArray(selection.value) && selection.value.length === 1;

	const isNewSelectionSingle =
		Array.isArray(newSelection) && newSelection.length === 1;

	// if user clicked (selected) the same row in multiple mode -> unselect
	// but if user selected multiple rows (by metaKey or ctrl), then proceed with normal selection behaviour
	if (
		isOldSelectionSingle &&
		isNewSelectionSingle &&
		selection.value[0].id === newSelection[0].id
	) {
		selection.value = [];
		return;
	}

	// default
	selection.value = newSelection;
}

function onContextMenu(event) {
	if (props.contextMenuSelectionMode) {
		contextMenuSelection.value = event.data; // set v-model
	}

	emit("contextMenu", event);
}
</script>

<template>
	<DataTable
		:value="props.value"
		dataKey="id"
		:totalRecords="props.totalRecords"
		v-model:rows="rowsPerPage"
		v-model:selection="selection"
		v-model:sortField="sortField"
		v-model:sortOrder="sortOrder"
		v-model:expandedRows="expandedRows"
		lazy
		@page="onPage"
		@stateRestore="onStateRestore"
		@sort="onSort"
		@row-contextmenu="onContextMenu"
		@update:selection="onSelectionChange"
		size="small"
		:selectionMode="onlyShow ? undefined : multiple ? 'multiple' : 'single'"
		:metaKeySelection="multiple"
		contextMenu
		:paginator="paginator"
		:rowClass="
			(row) => {
				// selected row in multiple mode, selection is array of objects (each row is object)
				if (
					Array.isArray(selection) &&
					selection.some((item) => item.id === row.id)
				) {
					return 'bg-zinc-200';
				}

				// selected row in single mode, selection is the row object
				else if (
					selection?.id === row.id ||
					contextMenuSelection?.id === row.id
				) {
					return 'bg-zinc-200';
				}

				// hover state
				return 'hover:bg-zinc-50';
			}
		"
		class="g-table h-full"
		:class="[
			paginator ? 'g-table-paginator' : 'g-table-without-paginator',
			multiple ? 'select-none' : '',
		]"
		scrollable
		scrollHeight="flex"
		removableSort
	>
		<slot>
			<!-- columns - Column PrimeVue components -->
		</slot>
		<template
			#paginatorcontainer="{
				first,
				last,
				page,
				pageLinks,
				totalRecords,
				firstPageCallback,
				prevPageCallback,
				changePageCallback,
				nextPageCallback,
				lastPageCallback,
			}"
		>
			<div
				class="relative flex justify-center items-center w-full text-sm text-gray-600"
			>
				<!-- LEFT: SELECTED RANGE OF ENTRIES FROM TOTALRECORDS COUNT MESSAGE -->
				<div class="absolute left-0">
					{{ first }} - {{ last }} z {{ totalRecords }}
					{{ entriesWordFor(totalRecords ?? 0) }}
				</div>

				<!-- CENTER: PAGES CONTROL -->
				<div
					class="flex w-fit gap-1 px-1.5 py-1 items-center bg-gray-100 rounded-full select-none"
				>
					<!-- first page -->
					<PaginationButton
						:icon="IconChevronLeftPipe"
						@click="firstPageCallback"
					/>

					<!-- prev page -->
					<PaginationButton :icon="IconChevronLeft" @click="prevPageCallback" />

					<ul class="flex gap-1">
						<!-- page 	-> 0 based index (0, 1, 2, 3 ...) -->
						<!-- p		-> 1 based index (1, 2, 3 ...) -->
						<!-- changePageCallback(pageNum) expects as pageNum 0 based indexed page num  -->
						<!-- used pageLinks instead of pageCount in following v-for, because its managed array with max. 5 pages (it will always be set to 5 pages moved trough all pages), instead of all pages as with pagesCount -->
						<li v-for="p in pageLinks" :key="p">
							<button
								@click="changePageCallback(p - 1)"
								:class="[
									'size-6.5 rounded-full cursor-pointer',
									page === p - 1
										? 'bg-primary text-white'
										: 'hover:bg-gray-200',
								]"
							>
								{{ p }}
							</button>
						</li>
					</ul>

					<!-- next page -->
					<PaginationButton
						:icon="IconChevronRight"
						@click="nextPageCallback"
					/>

					<!-- last page -->
					<PaginationButton
						:icon="IconChevronRightPipe"
						@click="lastPageCallback"
					/>
				</div>

				<!-- RIGHT: ROWS PER PAGE SELECT -->
				<div class="absolute right-0 space-x-2 flex items-center">
					<span>Zobrazit</span>
					<div class="relative">
						<select
							id="g4pl_rows_per_page"
							v-model="rowsPerPage"
							@change="onRowsPerPageChange"
							class="pl-3 pr-6 py-1 bg-gray-100 rounded-full cursor-pointer appearance-none"
						>
							<option v-for="r in rowsPerPageOptions" :value="r" :key="r">
								{{ r }}
							</option>
						</select>
						<IconChevronDown
							size="14"
							class="absolute top-2 right-1.5 pointer-events-none"
						/>
					</div>
					<span>{{ entriesWordFor(rowsPerPage) }}</span>
				</div>
			</div>
		</template>
		<template #empty>Žádné dostupné záznamy</template>
		<template #loading>
			<div class="flex flex-col items-center">
				Právě se načítají informace
				<IconLoader2 size="18" class="animate-spin" />
			</div>
		</template>
		<template #expansion="{ data }">
			<slot name="expansion" :data="data"></slot>
		</template>
	</DataTable>
</template>

<style>
/* EXAMPLE: left border on selected row */
/* .p-datatable-tbody > tr.row-selected-border > td:first-child {
	border-left: 3px solid var(--color-primary);
} */

/* focus-visible row outline */
.p-datatable-tbody > tr:focus-visible {
	outline: 1px solid var(--color-primary);
}

.p-datatable-column-title {
	font-weight: var(--font-weight-medium);
}

.g-table-paginator {
	.p-datatable-paginator-bottom {
		border: none;
	}

	.p-paginator.p-component {
		border: none;
		border-radius: var(--radius-xl);
		padding-top: 4px;
		padding-bottom: 4px;
	}
}

.g-table-without-paginator {
	/* bottom-right corner (last row, first column) */
	tbody tr:last-child td:first-child {
		border-bottom-left-radius: var(--radius-xl);
	}

	/* bottom-left corner (last row, last column) */
	tbody tr:last-child td:last-child {
		border-bottom-right-radius: var(--radius-xl);
	}

	/* last row */
	tbody tr:last-child td {
		border-bottom: none;
	}
}

.g-table {
	border-radius: var(--radius-xl);
	border: 1px solid var(--color-gray-200);
	overflow: hidden;

	/* table header container */
	thead {
		z-index: 2;
	}

	/* header cells */
	thead th {
		background: var(--color-gray-50);
		color: var(--color-gray-600);
		text-transform: uppercase;
		font-size: 10px;
		letter-spacing: 0.05em;

		padding-top: 8px;
		padding-bottom: 8px;
		padding-left: 10px;
		text-wrap: nowrap;
	}

	/* cell styling */
	tbody td {
		text-wrap: nowrap;
		max-width: 180px;
		overflow: hidden;
		text-overflow: ellipsis;

		font-size: var(--text-sm);
		color: var(--color-gray-800);

		padding-top: 8px;
		padding-bottom: 8px;
		padding-left: 10px;
	}

	/* top-left corner (header) */
	thead th:first-child {
		border-top-left-radius: var(--radius-xl);
	}

	/* top-right corner (header) */
	thead th:last-child {
		border-top-right-radius: var(--radius-xl);
	}
}
</style>
