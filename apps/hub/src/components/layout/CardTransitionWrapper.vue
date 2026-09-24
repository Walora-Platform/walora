<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<!-- for Transition animation to be active, slot needs to have v-if element, which the transition will be used for -->
<!-- because of mode="out-in", there can be multiple v-if components defined, when only 1 is active at a time -->
<template>
	<Transition
		mode="out-in"
		enterToClass="transition-opacity-scale ease-out duration-200"
		enterActiveClass="transition-opacity-scale duration-400 ease-out"
		enterFromClass="opacity-0 translate-y-4"
		leaveActiveClass="transition-opacity-scale  ease-in"
		leaveToClass="opacity-0 translate-y-4 duration-200"
	>
		<slot />
	</Transition>
</template>
