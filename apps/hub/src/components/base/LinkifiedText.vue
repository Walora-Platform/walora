<!-- PURPOSE: USE FOR TEXT WHERE YOU WANT TO MAKE LINKS CLICKABLE -->
<script setup lang="ts">
import { computed } from "vue";

type TextPart =
	| { type: "text"; value: string }
	| { type: "link"; value: string; href: string };

const props = defineProps<{
	text?: string | null;
}>();

const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;

function normalizeUrl(rawUrl: string) {
	const trailingPunctuationMatch = rawUrl.match(/[.,;:!?)]*$/);
	const trailing = trailingPunctuationMatch?.[0] ?? "";

	const cleanUrl = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;

	return { url: cleanUrl, trailing };
}

function linkifyText(text?: string | null): TextPart[] {
	if (!text) return [];

	const parts: TextPart[] = [];

	let lastIndex = 0;
	for (const match of text.matchAll(urlRegex)) {
		const rawUrl = match[0];
		const index = match.index ?? 0;

		if (index > lastIndex) {
			parts.push({
				type: "text",
				value: text.slice(lastIndex, index),
			});
		}

		const { url, trailing } = normalizeUrl(rawUrl);

		parts.push({
			type: "link",
			value: url,
			href: url,
		});

		if (trailing) {
			parts.push({
				type: "text",
				value: trailing,
			});
		}

		lastIndex = index + rawUrl.length;
	}

	if (lastIndex < text.length) {
		parts.push({
			type: "text",
			value: text.slice(lastIndex),
		});
	}

	return parts;
}

const parts = computed(() => linkifyText(props.text));
</script>

<template>
	<div class="whitespace-pre-wrap wrap-break-word">
		<template v-for="(part, index) in parts" :key="index">
			<a
				v-if="part.type === 'link'"
				:href="part.href"
				target="_blank"
				rel="noopener noreferrer"
				class="text-primary underline underline-offset-2"
			>
				{{ part.value }}
			</a>
			<template v-else>
				{{ part.value }}
			</template>
		</template>
	</div>
</template>
