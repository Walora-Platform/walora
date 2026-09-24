/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { formatTimeAgoIntl } from "@vueuse/core";

interface DateTimeObject {
	date: string;
	time: string;
}

// returns 'YYYY-MM-DD' - use for @db.Date columns on backend
export function toDateOnlyString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

export function formatDbDate(date: string): string | null {
	if (!date) return null;
	date = new Date(date);

	const iso = date.toISOString();
	const [year, month, day] = iso.slice(0, 10).split("-");

	return `${day}.${month}.${year}`;
}

export function timeAgo(isoString: string): string {
	return formatTimeAgoIntl(new Date(isoString), {
		locale: "cs-CZ",
	});
}

export function formatDate(isoString: string): DateTimeObject {
	if (!isoString) return { date: "", time: "" };
	const d = new Date(isoString);

	const day = padStart(d.getDate());
	const month = padStart(d.getMonth() + 1);
	const year = d.getFullYear();

	const hours = padStart(d.getHours());
	const minutes = padStart(d.getMinutes());

	return { date: `${day}.${month}.${year}`, time: `${hours}:${minutes}` };
}

// used in parcel edit form
// returns "" if time is not specified (if user did not specify time)
export function formatParcelTime(time: string): string | null {
	if (!time) return "";

	// check if user did edit the time with PrimeVue DatePicker that returns Date
	// if time is Date instance, then extract the time
	if (time.getMonth) {
		return formatDate(time).time; // returns "hh:mm"
	}

	// "hh:mm"
	if (time.match(/\d{1,2}:\d{2}/)) return time;

	return null;
}

export function formatPsc(psc?: string): string {
	if (!psc) return;
	return psc.slice(0, 3) + " " + psc.slice(3);
}

export function formatPscReverse(psc?: string): string {
	if (!psc) return;
	return psc.replace(" ", "");
}

export function formatPhoneNum(input?: string): string {
	if (!input) return "";

	const hasPlus = input.trim().startsWith("+");
	const digits = input.replace(/\D/g, "");

	// input is not phone number
	if (!digits) return input;

	// international format "+XXX XXX XXX XXX"
	if (hasPlus) {
		const country = digits.slice(0, 3);
		const rest = digits.slice(3);

		const groups = rest.match(/\d{1,3}/g) ?? [];

		return `+${country} ${groups.join(" ")}`.trim();
	}

	// local czech number "XXX XXX XXX"
	const groups = digits.match(/\d{1,3}/g) ?? [];
	return groups.join(" ");
}

function padStart(value: number): string {
	return String(value).padStart(2, "0");
}
