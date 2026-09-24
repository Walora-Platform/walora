<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
defineProps<{
	noPadding?: boolean;
	scrollable?: boolean; /* make card y-scrollable */
	innerDivClass?: any;
}>();
</script>

<template>
	<div
		:class="[
			'flex flex-col bg-white rounded-2xl shadow min-h-0 overflow-hidden',
			noPadding || scrollable ? '' : 'card-p',
		]"
	>
		<div
			:class="[
				'flex flex-col min-h-0 h-full',
				{ 'overflow-y-auto card-p scroll-smooth': scrollable },
				innerDivClass,
			]"
		>
			<slot></slot>
		</div>

		<!-- USE FOR ACTION BUTTONS FOR SIDE CONTENT -->
		<slot name="bottomActions"></slot>
	</div>
</template>
