/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

export function currentDateTimeString(): string {
	const now = new Date();

	const result = now.toLocaleString('cs', {
		timeZone: 'Europe/Prague',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});

	return result + ' (TZ Europe/Prague)';
}
