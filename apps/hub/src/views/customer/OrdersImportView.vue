<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { computed, ref } from "vue";
import api from "@/api/base";

import Divider from "primevue/divider";
import FileUpload, { type FileUploadSelectEvent } from "primevue/fileupload";

import { IconFileUpload, IconFiles, IconX } from "@tabler/icons-vue";
import { showToast } from "@/services/toast";
import { v7 as uuid } from "uuid";

interface UploadFile {
	id: string;
	data: File;
	status: "pending" | "success" | "error";
	errors?: string[];
	ordersCount?: number;
}

const files = ref<UploadFile[]>([]);
const fileUploadRef = ref();
const isUploading = ref<boolean>(false);

function onSelect(event: FileUploadSelectEvent) {
	const selected: File[] = event.files;
	const fileSizeLimit: number = 1 * 1024 * 1024; // 1 MB
	const filesLimit: number = 5; // 5 files max

	selected.forEach((f: File) => {
		// check for existing + add if its not duplicate
		if (!files.value.some((f2) => f2.data.name === f.name)) {
			let errorFlag: boolean = false;
			const fileCount: number = files.value.length;

			// check file size
			if (f.size > fileSizeLimit) {
				errorFlag = true;

				showToast({
					severity: "error",
					summary: "Vybraný soubor je příliš velký",
					detail: "Maximální velikost souboru je 1 MB",
					life: 5000,
				});
			}

			// check count of files limit
			if (fileCount + 1 > filesLimit) {
				errorFlag = true;
				showToast({
					severity: "error",
					summary: "Dosáhli jste limit pro počet souborů",
					detail: `Maximální počet souborů je ${filesLimit}`,
					life: 5000,
				});
			}

			// add if no error
			if (!errorFlag) {
				files.value.push({
					data: f,
					id: uuid(),
					status: "pending",
				});
			}
		}
	});

	// clear FileUpload internal files array
	fileUploadRef.value?.clear();
}

const removeFile = (file: File) =>
	(files.value = files.value.filter((f) => f !== file));

const clearFiles = () => (files.value = []);

async function uploadFiles() {
	try {
		isUploading.value = true;

		const formData = new FormData();

		// send pending files
		files.value.forEach((f) => {
			if (f.status === "pending") {
				formData.append("files", f.data);
				formData.append("fileIds", f.id);
			}
		});

		const res = await api.post("/parcels/orders", formData, {
			skipToast: true,
		});

		let results;
		if (res?.data) results = res.data;

		// assign results to files
		results.forEach((resFile) => {
			const file = files.value.find((f) => f.id === resFile.id);
			if (!file) return;

			file.status = resFile.status;

			if (resFile.status === "error") file.errors = resFile.errors;
			if (resFile.status === "success") file.ordersCount = resFile.ordersCount;
		});

		// show toast message
		if (files.value.some((f) => f.status !== "success")) {
			showToast({
				severity: "error",
				summary: "Některé soubory neprošli kontrolou",
				detail: "Prosím, opravte uvedené chyby",
				life: 5000,
			});
		} else {
			// all uploaded files where successfully parsed
			showToast({
				severity: "success",
				summary: "Všechny objednávky byli úspěšně přijaté",
				life: 5000,
			});
			clearFiles();
		}
	} catch (err) {
		console.log(err);

		showToast({
			severity: "error",
			summary: err.message,
			life: 4000,
		});
	} finally {
		isUploading.value = false;
	}
}

const cannotSendAll = computed(() =>
	files.value.some((f) => f.status === "error" || f.status === "success"),
);

const statusMessage = {
	pending: "Čeká na odeslání",
	error: "Nastala chyba, objednávky z tohto souboru nebyli přijaté",
};

const getStatusMessage = (status, ordersCount) => {
	// success status
	if (status === "success") {
		let m = "Úspěšne ";
		if (ordersCount === 1) m += "přijata 1 objednávka";
		else if (ordersCount < 5) m += `přijaté ${ordersCount} objednávky`;
		else m += `přijato ${ordersCount} objednávek`;

		return m;
	}

	// other statuses
	return statusMessage[status];
};

function formatSize(bytes: number) {
	return (bytes / 1024).toFixed(2) + " KB";
}
</script>

<template>
	<Card class="flex flex-col w-full">
		<CardHeader
			title="Nahrajte objednávky přeprav"
			subtitle="Podporujeme hromadné nahrání objednávek ve formátu XLSX"
		/>
		<div class="flex h-full min-h-0">
			<!-- LEFT: UPLOAD -->
			<div class="w-full h-full">
				<FileUpload
					ref="fileUploadRef"
					@select="onSelect"
					accept=".xlsx"
					:auto="false"
					multiple
					:showUploadButton="false"
					:showCancelButton="false"
					:pt="{
						root: 'flex flex-col rounded-xl border-0 pr-4 py-0 h-full',
						header: 'px-0 pb-3',
						content:
							'border-[1.5px] border-dashed rounded-xl border-slate-200 h-full justify-center',
					}"
				>
					<!-- CHOOSE BUTTON + 'OR' DIVIDER -->
					<template #header="{ chooseCallback }">
						<div class="flex flex-col gap-3 w-full">
							<Button @click="chooseCallback">
								<IconFiles size="18" />
								Vybrat XLSX
							</Button>
							<Divider :pt="{ content: 'flex items-center' }">
								<span class="text-xs text-slate-400">nebo</span>
							</Divider>
						</div>
					</template>

					<!-- DRAG & DROP -->
					<template #content>
						<div
							class="text-center text-zinc-500 flex flex-col items-center gap-6"
						>
							<div class="p-8 border-2 rounded-full border-slate-300 w-fit">
								<IconFiles class="text-slate-500" stroke="1.4" size="36" />
							</div>
							<div class="text-slate-500">
								<p class="text-sm">Přetáhnete sem XLSX soubory</p>
								<p class="text-xs">nebo klikněte tlačítko pro výběr</p>
							</div>
						</div>
					</template>
				</FileUpload>
			</div>

			<Divider layout="vertical" />

			<!-- RIGHT: FILE LIST -->
			<div class="w-full flex flex-col px-4 py-4.5 gap-6 min-w-0">
				<div class="w-full flex gap-2">
					<!-- SEND ORDERS -->
					<Button
						@click="uploadFiles"
						class="flex-1"
						:disabled="!files.length || cannotSendAll"
						:loading="isUploading"
					>
						<IconFileUpload size="18" />
						Poslat objednávky
					</Button>

					<!-- CANCEL ALL SELECTED FILES -->
					<Button
						@click="clearFiles"
						variant="ghost"
						:disabled="!files.length || isUploading"
					>
						<IconX size="17" />
						Zrušit výběr
					</Button>
				</div>

				<TransitionGroup
					v-if="files.length"
					name="file"
					tag="div"
					class="flex flex-col gap-2 overflow-y-auto file-scroll pb-2"
				>
					<div
						v-for="file in files"
						:key="file.data.name"
						class="flex flex-col justify-between px-3 py-3 border shadow rounded-xl gap-4"
						:class="
							file.status === 'success'
								? 'border-green-400'
								: file.status === 'error'
									? 'border-red-400'
									: 'border-slate-200'
						"
					>
						<div class="overflow-hidden text-nowrap flex justify-between">
							<div class="flex flex-col">
								<p class="text-sm font-medium text-ellipsis overflow-hidden">
									{{ file.data.name }}
								</p>
								<p class="text-xs text-slate-500">
									{{ formatSize(file.data.size) }} •
									<span>
										{{ getStatusMessage(file.status, file.ordersCount) }}
									</span>
								</p>
							</div>
							<button
								@click="removeFile(file)"
								class="cursor-pointer text-slate-500 hover:text-red-600 transition-colors"
							>
								<IconX size="16" />
							</button>
						</div>
						<p v-for="error in file.errors" class="text-sm mt-2 text-red-600">
							{{ error }}
						</p>
					</div>
				</TransitionGroup>

				<div
					v-if="files.length === 0"
					class="text-sm text-center text-slate-400"
				>
					Nebyli vybrány žádné soubory
				</div>
			</div>
		</div>
	</Card>
</template>

<style lang="css" scoped>
.file-scroll::-webkit-scrollbar {
	width: 6px;
}

.file-scroll::-webkit-scrollbar-track {
	background: transparent;
}

.file-scroll::-webkit-scrollbar-thumb {
	background-color: rgba(100, 116, 139, 0.5);
	border-radius: 9999px;
}

.file-enter-active,
.file-leave-active {
	transition: all 0.25s ease;
}

/* on add */
.file-enter-from {
	opacity: 0;
	transform: translateY(10px) scale(0.98);
}

.file-enter-to {
	opacity: 1;
	transform: translateY(0) scale(1);
}

/* on remove */
.file-leave-from {
	opacity: 1;
	transform: translateY(0) scale(1);
}

.file-leave-to {
	opacity: 0;
	transform: translateY(-10px) scale(0.98);
}

/* file moves to take another file space while that file is being removed */
.file-move {
	transition: transform 0.25s ease;
}
</style>
