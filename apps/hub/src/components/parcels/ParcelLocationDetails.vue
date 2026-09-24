<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { computed } from "vue";
import { formatDate, formatPhoneNum, formatPsc } from "@/utils/formatString";

import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import InputMask from "primevue/inputmask";
import FloatLabel from "primevue/floatlabel";
import DatePicker from "primevue/datepicker";

import { IconCheck } from "@tabler/icons-vue";

const locationDetails = defineModel();
defineProps<{
	locationType: "delivery" | "pickup";
	isEditing?: boolean;
	editErrors?: object;
}>();

const emit = defineEmits(["clearEditError"]);
</script>

<template>
	<!-- EDIT MODE -->
	<div v-if="isEditing" class="space-y-4 mt-1">
		<!-- DATE -->
		<div>
			<FloatLabel variant="on">
				<DatePicker
					v-model="locationDetails.date"
					:inputId="`g4pl_location_date_${locationType}`"
					:invalid="!!editErrors.date"
					@update:modelValue="
						emit('clearEditError', { section: locationType, field: 'date' })
					"
					dateFormat="dd.mm.yy"
					size="small"
					fluid
					:pt="{ dayView: 'text-sm' }"
				/>
				<label :for="`g4pl_location_date_${locationType}`">Datum</label>
			</FloatLabel>
			<ErrorMessage v-if="editErrors.date">
				{{ editErrors.date }}
			</ErrorMessage>
		</div>

		<!-- TIME FROM and TIME TO -->
		<div class="flex gap-2">
			<div>
				<FloatLabel variant="on">
					<DatePicker
						v-model="locationDetails.timeFrom"
						:inputId="`g4pl_location_time_from_${locationType}`"
						:invalid="!!editErrors.timeFrom"
						@update:modelValue="
							emit('clearEditError', {
								section: locationType,
								field: 'timeFrom',
							})
						"
						size="small"
						fluid
						timeOnly
					/>
					<label :for="`g4pl_location_time_from_${locationType}`">Čas od</label>
				</FloatLabel>
				<ErrorMessage v-if="editErrors.timeFrom">
					{{ editErrors.timeFrom }}
				</ErrorMessage>
			</div>

			<div>
				<FloatLabel variant="on">
					<DatePicker
						v-model="locationDetails.timeTo"
						:inputId="`g4pl_location_time_to_${locationType}`"
						:invalid="!!editErrors.timeTo"
						@update:modelValue="
							emit('clearEditError', {
								section: locationType,
								field: 'timeTo',
							})
						"
						size="small"
						fluid
						timeOnly
					/>
					<label :for="`g4pl_location_time_to_${locationType}`">Čas do</label>
				</FloatLabel>
				<ErrorMessage v-if="editErrors.timeTo">
					{{ editErrors.timeTo }}
				</ErrorMessage>
			</div>
		</div>

		<!-- NAME -->
		<div>
			<FloatLabel variant="on">
				<InputText
					v-model="locationDetails.name"
					:id="`g4pl_location_name_${locationType}`"
					:invalid="!!editErrors.name"
					@update:modelValue="
						emit('clearEditError', {
							section: locationType,
							field: 'name',
						})
					"
					inputmode="text"
					fluid
					maxLength="100"
					size="small"
				/>
				<label :for="`g4pl_location_name_${locationType}`">Název</label>
			</FloatLabel>
			<ErrorMessage v-if="editErrors.name">
				{{ editErrors.name }}
			</ErrorMessage>
		</div>

		<!-- STREET ADDRESS -->
		<div>
			<FloatLabel v-if="isEditing" variant="on">
				<InputText
					v-model="locationDetails.streetAddress"
					:id="`g4pl_location_street_adress_${locationType}`"
					:invalid="!!editErrors.streetAddress"
					@update:modelValue="
						emit('clearEditError', {
							section: locationType,
							field: 'streetAddress',
						})
					"
					inputmode="text"
					fluid
					maxLength="100"
					size="small"
				/>
				<label :for="`g4pl_location_street_adress_${locationType}`">
					Ulice a č.p.
				</label>
			</FloatLabel>
			<ErrorMessage v-if="editErrors.streetAddress">
				{{ editErrors.streetAddress }}
			</ErrorMessage>
		</div>

		<!-- CITY -->
		<div>
			<FloatLabel variant="on">
				<InputText
					v-model="locationDetails.city"
					:id="`g4pl_location_city_${locationType}`"
					:invalid="!!editErrors.city"
					@update:modelValue="
						emit('clearEditError', {
							section: locationType,
							field: 'city',
						})
					"
					inputmode="text"
					fluid
					maxLength="100"
					size="small"
				/>
				<label :for="`g4pl_location_city_${locationType}`">Město</label>
			</FloatLabel>
			<ErrorMessage v-if="editErrors.city">
				{{ editErrors.city }}
			</ErrorMessage>
		</div>

		<!-- POSTAL CODE and STATE -->
		<div class="flex gap-2">
			<div>
				<FloatLabel variant="on">
					<InputMask
						v-model="locationDetails.psc"
						:id="`g4pl_location_psc_${locationType}`"
						:invalid="!!editErrors.psc"
						@update:modelValue="
							emit('clearEditError', {
								section: locationType,
								field: 'psc',
							})
						"
						mask="999 99"
						fluid
						size="small"
					/>
					<label :for="`g4pl_location_psc_${locationType}`">PSČ</label>
				</FloatLabel>
				<ErrorMessage v-if="editErrors.psc">
					{{ editErrors.psc }}
				</ErrorMessage>
			</div>

			<div>
				<FloatLabel variant="on">
					<InputText
						v-model="locationDetails.state"
						:id="`g4pl_location_state_${locationType}`"
						:invalid="!!editErrors.state"
						@update:modelValue="
							emit('clearEditError', {
								section: locationType,
								field: 'state',
							})
						"
						inputmode="text"
						fluid
						maxLength="100"
						size="small"
					/>
					<label :for="`g4pl_location_state_${locationType}`">Stát</label>
				</FloatLabel>
				<ErrorMessage v-if="editErrors.state">
					{{ editErrors.state }}
				</ErrorMessage>
			</div>
		</div>

		<!-- CONTACT PHONE -->
		<FloatLabel variant="on">
			<InputText
				:id="`g4pl_location_contact_phone_${locationType}`"
				inputmode="text"
				v-model="locationDetails.contactPhone"
				fluid
				maxLength="100"
				size="small"
			/>
			<label :for="`g4pl_location_contact_phone_${locationType}`">
				Kontakt - telefónní číslo
			</label>
		</FloatLabel>

		<!-- CONTACT NAME -->
		<FloatLabel variant="on">
			<InputText
				:id="`g4pl_location_contact_name_${locationType}`"
				inputmode="text"
				v-model="locationDetails.contactName"
				fluid
				maxLength="100"
				size="small"
			/>
			<label :for="`g4pl_location_contact_name_${locationType}`">
				Kontakt - jméno
			</label>
		</FloatLabel>

		<!-- DELIVERY NOTE -->
		<FloatLabel v-if="locationType === 'delivery'" variant="on">
			<InputText
				:id="`g4pl_location_note_${locationType}`"
				inputmode="text"
				v-model="locationDetails.note"
				fluid
				maxLength="100"
				size="small"
			/>
			<label :for="`g4pl_location_note_${locationType}`">Poznámka</label>
		</FloatLabel>
	</div>

	<!-- READ MODE -->
	<div v-else class="flex flex-col">
		<!-- DATE AND TIME RANGE -->
		<div class="mb-0.5">
			{{ formatDate(locationDetails.date).date }}

			<SubText>
				{{ locationDetails.timeFrom }}
				<span v-if="locationDetails.timeTo">
					- {{ locationDetails.timeTo }}
				</span>
			</SubText>
		</div>
		<span class="font-medium">{{ locationDetails.name }}</span>
		<span>{{ locationDetails.streetAddress }}</span>
		<span>
			{{ formatPsc(locationDetails.psc) }}
			{{ locationDetails.city }}
		</span>
		<span>{{ locationDetails.state }}</span>
		<div
			v-if="locationDetails.contactName || locationDetails.contactPhone"
			class="mt-1"
		>
			{{ formatPhoneNum(locationDetails.contactPhone) }}
			<SubText>
				{{ locationDetails.contactName }}
			</SubText>
		</div>
		<span v-if="locationDetails.note">
			<SubText>Pozn.:</SubText>
			{{ locationDetails.note }}
		</span>
	</div>
</template>
