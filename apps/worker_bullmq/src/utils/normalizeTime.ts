/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

export function normalizeTime(time: string): string {
	if (!time) return time;

	let [hours, minutes] = time.split(':');
	if (hours == '24') hours = '00'; // 24:00 -> 00:00

	return `${hours.padStart(2, '0')}:${minutes}`;
}
