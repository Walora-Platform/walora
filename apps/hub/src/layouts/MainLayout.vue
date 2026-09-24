<!-- 
	Copyright 2025-2026 Tomáš Bordák

	Licensed under the Apache License, Version 2.0.
	See the LICENSE file in the project root for details.
-->

<template>
	<div class="h-dvh flex flex-col overflow-hidden">
		<!-- top bar -->
		<NavigationBar />

		<div class="flex flex-1 min-h-0 min-w-0 m-2 gap-2">
			<!-- left main menu -->
			<MainMenu />

			<!-- CONTENT -->
			<ContentContainer class="flex-1 min-w-0">
				<RouterView />
			</ContentContainer>
		</div>
	</div>
</template>
