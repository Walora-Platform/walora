/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

// Source - https://stackoverflow.com/a/63877129
// Posted by Ryan King, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-23, License - CC BY-SA 4.0
export function isValidISODate(date: string): boolean {
	const d = new Date(date);

	// isNaN(Invalid Date) == true
	return !isNaN(d.getTime());
}

// "hh:mm"
export function isValidTimeString(time: string): boolean {
	/[0-1][0-9]|2[0-3]:[0-5][0-9]/.test(time);
}

// "DDDDD"
export function isValidPsc(psc: string): boolean {
	return /[0-9]{5}/.test(psc);
}
