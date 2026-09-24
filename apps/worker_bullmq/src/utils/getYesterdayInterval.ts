/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

// object for prisma query
type GteLteObject = {
	gte: Date;
	lte: Date;
};

export function getYesterdayInterval(): GteLteObject {
	const now = new Date();

	const yesterday = new Date();
	yesterday.setDate(now.getDate() - 1);

	// yesterday 00:00:00
	const yesterdayStart = new Date(yesterday);
	yesterdayStart.setHours(0, 0, 0, 0);

	// yesterday 23:59:59
	const yesterdayEnd = new Date(yesterday);
	yesterdayEnd.setHours(23, 59, 59, 999);

	return {
		gte: yesterdayStart,
		lte: yesterdayEnd,
	};
}
