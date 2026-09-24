<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<script setup lang="ts">
import Message from "primevue/message";
</script>

<template>
	<Message
		variant="simple"
		severity="error"
		:pt="{ text: 'text-xs', root: 'ml-1 mt-0.5 flex' }"
	>
		<slot></slot>
	</Message>
</template>
