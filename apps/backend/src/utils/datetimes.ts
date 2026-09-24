/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

// returns date in format 'DD.MM.YYYY' from given date
export function formatDate(date: Date | null) {
	if (!date) return null;

	const result = date.toLocaleDateString('cs', {
		timeZone: 'Europe/Prague',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});

	// '01. 01. 2026' -> '01.01.2026'
	return result.replaceAll(' ', '');
}

export function formatTime(date: Date | null) {
	if (!date) return null;

	return date.toLocaleString('cs', {
		timeZone: 'Europe/Prague',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
}

/* use as formatting function for @db.Date columns which are 00:00:00Z (UTC midnight) */
export function formatDbDate(date: Date | null) {
	if (!date) return null;

	const iso = date.toISOString();
	const [year, month, day] = iso.slice(0, 10).split('-');

	return `${day}.${month}.${year}`;
}
