<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<template>
	<Transition
		mode="out-in"
		enterToClass="opacity-100 translate-y-0"
		enterActiveClass="transition-all duration-150 ease-out"
		enterFromClass="opacity-0 -translate-y-2"
		leaveActiveClass="transition-all duration-150 ease-in"
		leaveFromClass="opacity-100 translate-y-0"
		leaveToClass="opacity-0 -translate-y-2"
	>
		<slot />
	</Transition>
</template>
