/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

// returns date (00:00) thats in Europe/Prague TZ (but its in UTC format for comparing)
// DO NOT CHANGE THIS FUNCTION, IT MIGHT BREAK CODE
export function getTodayDateUTCMidnight(): Date {
	const now = new Date();

	const prague = new Date(
		now.toLocaleString('cz', { timeZone: 'Europe/Prague' }),
	);

	return new Date(
		Date.UTC(prague.getFullYear(), prague.getMonth(), prague.getDate()),
	);
}

export function toDateOnlyPrague(date: Date): string {
	const prague = new Date(
		date.toLocaleString('cz', { timeZone: 'Europe/Prague' }),
	);

	return prague.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
	const d = new Date(date);

	d.setUTCDate(d.getUTCDate() + days);
	return d;
}
