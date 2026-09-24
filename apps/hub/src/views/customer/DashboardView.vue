<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import api from "@/api/base";

import { BarChart, AreaChart, LegendPosition, LineChart } from "vue-chrts";
import Divider from "primevue/divider";

import {
	IconPackage,
	IconTruckDelivery,
	IconRoute,
	IconCalendarWeek,
	IconChartPie,
	IconPointFilled,
} from "@tabler/icons-vue";

/* KPIs */
const parcelsToday = ref(); // KPI 1
const withoutProblem = ref(); // KPI 2
const palletsCount = ref(); // KPI 3

/* GRAPHS */
const palletsComparisonGraph = reactive({
	data: null, // graph data with both X and Y values
	metadata: null, // metadata contains legend and color
});

const palletsFromStartOfYearGraph = reactive({
	data: null,
	metadata: null,
});

const xFormatter = (i: number): string => {
	if (!palletsComparisonGraph.data) return;
	return `${palletsComparisonGraph.data[i]?.day}`;
};

/* source: https://nuxtcharts.com/docs/charts/area-chart#basic-area-chart */
const xAreaChartFormatter = (i: number): string => {
	return `${palletsFromStartOfYearGraph.data[i]?.day}`;
};

onMounted(async () => {
	const res = await api.get("/dashboard/data");
	if (!res) return;

	/* KPIs */
	const {
		parcelsToday: pToday,
		withoutProblem: wProblem,
		palletsCount: pCount,
	} = res.data?.kpis;

	parcelsToday.value = pToday;
	withoutProblem.value = wProblem;
	palletsCount.value = pCount;

	/* GRAPHS */
	const {
		loadedPalletsComparison: pComparison,
		loadedPalletsFromStartOfYear: pFromStartOfYear,
	} = res.data?.graphs;

	/* GRAPH 1 */
	palletsComparisonGraph.data = pComparison.data;
	palletsComparisonGraph.metadata = pComparison.metadata;
	palletsComparisonGraph.metadata.currentMonth.color = "#155dfc";
	palletsComparisonGraph.metadata.lastMonth.color = "#93c5fd";

	/* GRAPH 2 */
	palletsFromStartOfYearGraph.data = pFromStartOfYear.data;
	palletsFromStartOfYearGraph.metadata = pFromStartOfYear.metadata;
	palletsFromStartOfYearGraph.metadata.pallets.color = "#155dfc";
});
</script>

<template>
	<div
		class="flex flex-col gap-2 h-full min-h-0 overflow-y-auto scroll-smooth no-scrollbar pb-0.5 w-full"
	>
		<!-- KPIs -->
		<div class="flex w-full gap-2">
			<!-- PARCELS TODAY vs PARCELS THE SAME DAY LAST WEEK -->
			<CardKPI
				title="Přijaté zásilky"
				:subtitle="parcelsToday?.period"
				:value="parcelsToday?.value"
				:percentage="parcelsToday?.diffPercentage"
				:diff="parcelsToday?.diffDetails"
				:trend="parcelsToday?.trend"
				:icon="IconPackage"
				primary
			/>

			<!-- PARCELS WITHOUT PROBLEM LAST MONTH vs THE MONTH BEFORE LAST -->
			<CardKPI
				title="Poměr zásilek bez nezhody"
				:subtitle="withoutProblem?.period"
				:value="withoutProblem?.value"
				:percentage="withoutProblem?.diffPercentage"
				:diff="withoutProblem?.diffDetails"
				:trend="withoutProblem?.trend"
				:icon="IconChartPie"
			/>

			<!-- KPI 3 -->
			<CardKPI
				title="Doručeno palet"
				:subtitle="palletsCount?.period"
				:value="palletsCount?.value"
				:percentage="palletsCount?.diffPercentage"
				:diff="palletsCount?.diffDetails"
				:trend="palletsCount?.trend"
				:icon="IconTruckDelivery"
			/>
		</div>

		<!-- GROUPED BAR CHART -->
		<Card class="p-5! shrink-0">
			<CardHeader
				title="Počet naložených palet v porovnání s minulým měsícem"
				subtitle="Graf porovnává počty naložených palet v tem istém pracovném dni podle jeho pořadí v měsíci"
			/>

			<BarChart
				:data="palletsComparisonGraph.data ?? []"
				:categories="palletsComparisonGraph.metadata ?? {}"
				:yAxis="['currentMonth', 'lastMonth']"
				:xFormatter="xFormatter"
				:radius="6"
				:xTickLine="true"
				:xNumTicks="8"
				:legendPosition="LegendPosition.TopRight"
				legendStyle="margin-bottom: 2px"
				class="py-1"
			>
				<template #tooltip="{ values }">
					<div class="flex flex-col text-sm">
						<!-- WEEKDAY OCCURENCE -->
						<span class="font-medium pl-3 pr-4 pt-2.5 pb-1.5">
							{{ values?.weekdayOccurence }}
						</span>

						<Divider class="m-0 w-full" />

						<div class="pl-1.5 pr-3 py-2 space-y-1">
							<!-- CURRENT MONTH -->
							<div class="flex items-center">
								<IconPointFilled
									size="21"
									:color="`${palletsComparisonGraph.metadata?.currentMonth.color}`"
								/>
								<span class="w-16">{{ values?.day }}</span>
								<span class="font-medium">{{ values?.currentMonth }}</span>
							</div>

							<!-- LAST MONTH -->
							<div class="flex items-center text-sm">
								<IconPointFilled
									size="21"
									:color="`${palletsComparisonGraph.metadata?.lastMonth.color}`"
								/>
								<div v-if="values?.lastMonthDay" class="inline-flex">
									<div class="w-16">{{ values?.lastMonthDay }}</div>
									<div class="font-medium">{{ values?.lastMonth }}</div>
								</div>
								<span v-else>-</span>
							</div>
						</div>
					</div>
				</template>
			</BarChart>
		</Card>

		<!-- TREND CHART -->
		<Card class="p-5 shrink-0" noPadding>
			<CardHeader
				title="Počet naložených palet od začátku roka"
				subtitle="Graf zobrazuje trend počtů naložených palet v zásilkách"
			/>

			<AreaChart
				:data="palletsFromStartOfYearGraph.data ?? []"
				:categories="palletsFromStartOfYearGraph.metadata ?? {}"
				:xFormatter="xAreaChartFormatter"
				:yGridLine="true"
				:xNumTicks="3"
				:yNumTicks="3"
				:legendPosition="LegendPosition.TopRight"
				legendStyle="margin-bottom: 2px"
				class="py-1"
			>
				<template #tooltip="{ values }">
					<div class="flex items-center text-sm pl-1.5 pr-3 py-2">
						<IconPointFilled
							size="21"
							:color="`${palletsFromStartOfYearGraph.metadata?.pallets.color}`"
						/>
						<span class="w-16">{{ values?.day }}</span>
						<span class="font-medium">{{ values?.pallets }}</span>
					</div>
				</template>
			</AreaChart>
		</Card>
	</div>
</template>
