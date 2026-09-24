<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<template>
	<Card class="w-full">
		<div class="h-138 pl-4 text-center m-auto">
			<img
				v-if="$slots.default"
				src="@/assets/loading.avif"
				width="400"
				class="mx-auto"
			/>
			<img v-else src="@/assets/building.avif" width="400" class="mx-auto" />
			<div v-if="!$slots.default">
				<h2 class="text-2xl font-semibold mb-2 mt-4">Pracujeme na tom</h2>
				<p class="text-gray-600 text-sm">
					Tuto stránku pro vás právě připravujeme. Brzy bude k dispozici.
				</p>
			</div>
			<slot></slot>
		</div>
	</Card>
</template>
