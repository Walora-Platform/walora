/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

interface DayRange {
	gte: Date;
	lte: Date;
}

export interface MonthRange {
	gte: Date;
	lt: Date;
}

export function getEffectiveDay(date: Date = new Date()): Date {
	const d = new Date(date);
	const day = d.getDay();

	// 0 - sunday
	if (day === 0) d.setDate(d.getDate() - 2);

	// 6 - saturday
	if (day === 6) d.setDate(d.getDate() - 1);

	return d;
}

export function dayRange(date: Date): DayRange {
	const gte = new Date(date);
	gte.setHours(0, 0, 0, 0);

	const lte = new Date(date);
	lte.setHours(23, 59, 59, 599);

	return { gte, lte };
}

export function getMonthRange(date: Date): MonthRange {
	const gte = new Date(date.getFullYear(), date.getMonth(), 1);
	const lt = new Date(date.getFullYear(), date.getMonth() + 1, 1);

	return { gte, lt };
}

export function getWorkingDays(year: number, month: number): Date[] {
	const weekdays: Date[] = [];
	const date = new Date(year, month, 1);

	// stay in the same month
	while (date.getMonth() === month) {
		const day = date.getDay();

		// push monday to friday, skip weekends (0 - Sunday, 6 - Saturday)
		if (day !== 0 && day !== 6) {
			weekdays.push(new Date(date));
		}

		date.setDate(date.getDate() + 1);
	}

	return weekdays;
}

// occurence of weekday in month (first Monday, second Monday, ...)
export function getWeekdayOccurence(date: Date): number {
	return Math.ceil(date.getDate() / 7);
	/* const weekday = date.getDay();

	const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
	let occurenceCount = 0;

	for (let d = new Date(firstDay); d <= date; d.setDate(d.getDate() + 1)) {
		if (d.getDay() === weekday) {
			occurenceCount++;
		}
	}

	return occurenceCount; */
}

export function findMatchingDay(
	prevMonthDays: Date[],
	weekday: number,
	occurence: number,
) {
	const sameWeekdays = prevMonthDays.filter((d) => d.getDay() === weekday);

	return sameWeekdays[occurence - 1] ?? null;
}
