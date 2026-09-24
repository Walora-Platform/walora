<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import { type Component, computed } from "vue";
import { IconArrowUpRight, IconArrowDownLeft } from "@tabler/icons-vue";

const props = defineProps<{
	title: string;
	subtitle?: string;
	value?: string;
	percentage?: number;
	diff?: string;
	trend?: "UP" | "DOWN";
	primary?: boolean;
	icon: Component;
}>();
</script>

<template>
	<div class="relative flex-1">
		<div
			:class="[
				'relative h-37 flex flex-col justify-between rounded-2xl p-5 shadow overflow-hidden transition',
				primary ? 'bg-primary text-white' : 'bg-white text-black',
			]"
		>
			<!-- TITLE + SUBTITLE  -->
			<div class="flex gap-1 items-baseline">
				<h3 class="text-[15px] font-[450]">{{ title }}</h3>
				<span :class="['text-xs', primary ? 'text-white' : 'text-gray-500']">
					{{ subtitle }}
				</span>
			</div>

			<!-- VALUE -->
			<h1 class="text-[26.5px] font-medium">{{ value }}</h1>

			<!-- TREND + DIFF DETAIL + KPI ICON -->
			<div class="flex items-center gap-2 mt-3">
				<Tag :variant="primary ? 'KPI-PRIMARY' : `TREND-${trend}`">
					<div class="flex">
						<IconArrowUpRight v-if="trend === 'UP'" size="15" />
						<IconArrowDownLeft v-else size="15" />
						<div class="flex gap-px">
							<span>{{ percentage }}</span>
							<span>%</span>
						</div>
					</div>
				</Tag>
				<span :class="['text-xs', primary ? 'text-white' : 'text-gray-500']">
					{{ diff }}
				</span>
				<div
					:class="[
						'absolute right-5 top-5 p-3 rounded-full',
						primary ? 'bg-purple-200/20' : 'bg-gray-100',
					]"
				>
					<component :is="icon" size="24" stroke="1.7" />
				</div>
				<div
					v-if="primary"
					class="absolute -right-10 -bottom-12 size-28 bg-purple-300/20 rounded-full"
				>
					<div class="absolute inset-x-7 size-18 bg-blue-300/20 rounded-full" />
				</div>
			</div>
		</div>
	</div>
</template>
