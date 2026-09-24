/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import prisma from '../../config/prisma.js';
import {
	getEffectiveDay,
	dayRange,
	getMonthRange,
	MonthRange,
	getWorkingDays,
	getWeekdayOccurence,
	findMatchingDay,
} from '../../utils/helpers.js';

type KPITrend = 'UP' | 'DOWN';

interface KPIObject {
	period: string;
	value: string;
	trend: KPITrend;
	diffPercentage: number;
	diffDetails: string;
}

interface LoadedPalletsGraphData {
	day: string;
	lastMonthDay?: string;
	currentMonth: number;
	lastMonth?: number;
	weekdayOccurence: string;
}

interface LoadedPalletsGraphMetadata {
	currentMonth: {
		name: string;
	};
	lastMonth: {
		name: string;
	};
}

interface LoadedPalletsGraph {
	data: LoadedPalletsGraphData[];
	metadata: LoadedPalletsGraphMetadata;
}

export async function getDashboardData(user) {
	const companyId = user.customerCompanyId;
	return {
		kpis: {
			parcelsToday: await getParcelsToday(companyId),
			withoutProblem: await getWithoutProblemParcelsRatioLastMonth(companyId),
			palletsCount: await getPalletsCountDeliveredOrClosedLastMonth(companyId),
		},
		graphs: {
			loadedPalletsComparison:
				await getGroupedBarGraphForLoadedPalletsComparison(companyId),
			loadedPalletsFromStartOfYear:
				await getAreaGraphForLoadedPalletsThisYear(companyId),
		},
	};
}

/* KPI 1 */
// count of received customer's parcels today vs count of recieved customer's parcels the same business day last week
async function getParcelsToday(companyId: string): KPIObject {
	const today = getEffectiveDay();
	const lastWeek = new Date(today);
	lastWeek.setDate(today.getDate() - 7); // effective day a week before

	const todayRange = dayRange(today);
	const lastWeekRange = dayRange(lastWeek);

	const todayCount = await parcelsCountOn(todayRange, companyId);
	const lastWeekCount = await parcelsCountOn(lastWeekRange, companyId);

	return {
		period: 'dnes',
		value: String(todayCount),
		trend: getTrend(todayCount - lastWeekCount),
		diffPercentage: percentDiff(todayCount, lastWeekCount),
		diffDetails: `vs ${lastWeekCount} ${getCZStringLastWeekBusinessDay(lastWeek.getDay())}`,
	};
}

/* KPI 2 */
// percentage of customer's parcels without problem compared to all customer parcels in the last month (vs the month before last month)
async function getWithoutProblemParcelsRatioLastMonth(
	companyId: string,
): KPIObject {
	const { lastMonth, lastMonthDate, prevMonth, prevMonthDate } =
		lastAndItsPreviousMonthDateAndRange();

	const [
		lastMonthTotal,
		lastMonthWithoutProblem,
		prevMonthTotal,
		prevMonthWithoutProblem,
	] = await Promise.all([
		// lastMonthTotal
		prisma.parcel.count({
			where: {
				customerId: companyId,
				createdAt: lastMonth,
			},
		}),

		//lastMonthWithoutProblem
		prisma.parcel.count({
			where: {
				customerId: companyId,
				problem: false,
				createdAt: lastMonth,
			},
		}),

		// prevMonthTotal
		prisma.parcel.count({
			where: {
				customerId: companyId,
				createdAt: prevMonth,
			},
		}),

		// prevMonthWithoutProblem
		prisma.parcel.count({
			where: {
				customerId: companyId,
				problem: false,
				createdAt: prevMonth,
			},
		}),
	]);

	const lastMonthPercent = percent(lastMonthWithoutProblem, lastMonthTotal);
	const prevMonthPercent = percent(prevMonthWithoutProblem, prevMonthTotal);

	const diff = (lastMonthPercent - prevMonthPercent).toFixed(1);

	return {
		period: lastMonthWithYear(),
		value: `${Number(lastMonthPercent.toFixed(1))} %`,
		trend: getTrend(diff),
		diffPercentage: Math.abs(diff),
		diffDetails: `vs ${Number(prevMonthPercent.toFixed(1))}% ${monthString(prevMonthDate)}`,
	};
}

/* KPI 3 */
// count of pallets in the last month (vs the month before last) based on their deliveryDate
// counts delivered and closed parcels
async function getPalletsCountDeliveredOrClosedLastMonth(
	companyId: string,
): KPIObject {
	const { lastMonth, lastMonthDate, prevMonth, prevMonthDate } =
		lastAndItsPreviousMonthDateAndRange();

	const [lastMonthPallets, prevMonthPallets] = await Promise.all([
		getDeliveredOrClosedPalletsSum(lastMonth, companyId),
		getDeliveredOrClosedPalletsSum(prevMonth, companyId),
	]);

	const diff = lastMonthPallets - prevMonthPallets;

	return {
		period: lastMonthWithYear(),
		value: String(lastMonthPallets),
		trend: getTrend(diff),
		diffPercentage: percentDiff(lastMonthPallets, prevMonthPallets),
		diffDetails: `vs ${prevMonthPallets} ${monthString(prevMonthDate)}`,
	};
}

/* GRAPH 1 */
async function getGroupedBarGraphForLoadedPalletsComparison(
	companyId: string,
): LoadedPalletsGraph {
	const now = new Date();

	// month of now can be changed, then another range of 2 months comparison will be evaluated
	//now.setMonth(now.getMonth() - 1);

	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();

	const prevMonthDate = new Date(currentYear, currentMonth - 1);
	const prevYear = prevMonthDate.getFullYear();
	const prevMonth = prevMonthDate.getMonth();

	// range of days to select parcels from
	const startOfPrevMonth = new Date(prevYear, prevMonth, 1);
	const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 1); // its the start of next month after current, but it will be compared as 'lt' -> lower than

	// select parcels from db
	const parcels = await prisma.parcel.findMany({
		where: {
			customerId: companyId,
			status: { in: ['LOADED', 'DELIVERED', 'CLOSED'] },
			pickupDate: {
				gte: startOfPrevMonth,
				lt: endOfCurrentMonth,
			},
		},
		select: {
			pickupDate: true,
			palletsCount: true,
		},
	});

	// aggregate by date
	const palletsByDate = new Map<string, number>();

	for (const p of parcels) {
		if (!p.pickupDate) continue;

		const key = dateToKey(p.pickupDate);

		palletsByDate.set(
			key,
			(palletsByDate.get(key) ?? 0) + (p.palletsCount ?? 0),
		);
	}

	// working days only
	const currentDays = getWorkingDays(currentYear, currentMonth);
	const prevDays = getWorkingDays(prevYear, prevMonth);

	// grouped bar data
	const data: LoadedPalletsGraphData[] = [];

	for (const date of currentDays) {
		const weekday = date.getDay();
		const occurence = getWeekdayOccurence(date);

		const prevDate = findMatchingDay(prevDays, weekday, occurence);

		const keyCurrent = dateToKey(date);
		const keyPrev = dateToKey(prevDate);

		data.push({
			day: formatLabel(date), // label
			currentMonth: palletsByDate.get(keyCurrent) ?? 0, // value

			// lastMonth day needs to be undefined, if it does not exist - for correct graph display
			// undefined will be 0 bar -> better
			// null would not display the whole grouped bar
			lastMonthDay: prevDate ? formatLabel(prevDate) : undefined,
			lastMonth: keyPrev ? (palletsByDate.get(keyPrev) ?? 0) : undefined,
			weekdayOccurence: weekdayOccurenceLabel(date, occurence),
		});
	}

	// graph metadata
	const metadata: LoadedPalletsGraphMetadata = {
		currentMonth: {
			name: monthString(now),
		},
		lastMonth: {
			name: monthString(prevMonthDate),
		},
	};

	return { data, metadata };
}

/* GRAPH 2 */
async function getAreaGraphForLoadedPalletsThisYear(companyId: string) {
	const now = new Date();
	const startOfYear = new Date(now.getFullYear(), 0, 1);

	const parcels = await prisma.parcel.findMany({
		where: {
			customerId: companyId,
			pickupDate: {
				gte: startOfYear,
				lte: now,
			},
			status: {
				in: ['LOADED', 'DELIVERED', 'CLOSED'],
			},
		},
		select: {
			pickupDate: true,
			palletsCount: true,
		},
	});

	const palletsByDate: Record<string, number> = {};

	for (const parcel of parcels) {
		if (!parcel.palletsCount) continue;

		const key = dateToKey(parcel.pickupDate);

		if (!palletsByDate[key]) palletsByDate[key] = 0;

		palletsByDate[key] += parcel.palletsCount ?? 0;
	}

	const days: Date[] = [];

	for (let d = new Date(startOfYear); d <= now; d.setDate(d.getDate() + 1)) {
		days.push(new Date(d));
	}

	// area chart data
	const data = days.map((date) => {
		const key = dateToKey(date);

		return {
			day: formatLabel(date),
			pallets: palletsByDate[key] ?? 0,
		};
	});

	// area chart metadata
	const metadata = {
		pallets: {
			name: `${formatFullDate(startOfYear)} - ${formatFullDate(now)}`,
		},
	};

	return {
		data,
		metadata,
	};
}

/* ------ HELP FUNCTIONS ------ */
async function getDeliveredOrClosedPalletsSum(
	when: MonthRange,
	companyId: string,
) {
	const agg = await prisma.parcel.aggregate({
		_sum: { palletsCount: true },
		where: {
			customerId: companyId,
			deliveryDate: when,
			status: {
				in: ['DELIVERED', 'CLOSED'],
			},
		},
	});

	return agg._sum.palletsCount ?? 0;
}

async function parcelsCountOn(range, companyId) {
	return await prisma.parcel.count({
		where: {
			customerId: companyId,
			createdAt: range,
			status: {
				not: 'CANCELLED',
			},
		},
	});
}

// returns string in format 'YYYY-MM-DD'
function dateToKey(date: Date): string | null {
	if (!date) return null;
	return date.toISOString().slice(0, 10);
}

function formatLabel(date: Date) {
	const weekdays = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

	return `${weekdays[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}.`;
}

function formatFullDate(date: Date): string {
	const formatted = new Intl.DateTimeFormat('cs-CZ', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(date);
	return formatted.replaceAll(' ', '');
}

function weekdayOccurenceLabel(date: Date, occurence: number): string {
	const occurenceLabels = [
		{ day: 'pondelí', occur: ['První', 'Druhé', 'Třetí', 'Čtvrté', 'Páté'] },
		{ day: 'úterý', occur: ['První', 'Druhé', 'Třetí', 'Čtvrté', 'Páté'] },
		{ day: 'středa', occur: ['První', 'Druhá', 'Třetí', 'Čtvrtá', 'Pátá'] },
		{ day: 'čtvrtek', occur: ['První', 'Druhý', 'Třetí', 'Čtvrtý', 'Pátý'] },
		{ day: 'pátek', occur: ['První', 'Druhý', 'Třetí', 'Čtvrtý', 'Pátý'] },
	];

	const dayIndex = date.getDay() - 1;
	return `${occurenceLabels[dayIndex].occur[occurence - 1]} ${occurenceLabels[dayIndex].day}`;
}

function lastAndItsPreviousMonthDateAndRange() {
	const now = new Date();

	const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonth = getMonthRange(lastMonthDate);

	const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
	const prevMonth = getMonthRange(prevMonthDate);

	return { lastMonthDate, lastMonth, prevMonth, prevMonthDate };
}

function percentDiff(current: number, previous: number) {
	if (previous === 0) return current > 0 ? 100 : 0;
	const diff = Math.abs(((current - previous) / previous) * 100).toFixed(1);

	return Number(diff);
}

function percent(withoutProblem: number, total: number) {
	if (total === 0) return 0;
	return (withoutProblem / total) * 100;
}

function getTrend(diff: number) {
	if (diff >= 0) return 'UP';
	return 'DOWN';
}

const prevEffectiveDayMap = {
	1: 'minulé pondelí', // monday
	2: 'minulé úterý', // tuesday
	3: 'minulou středu', // wednesday
	4: 'minulý čtvrtek', // thursday
	5: 'minulý pátek', // friday
};

const getCZStringLastWeekBusinessDay = (dayOfWeek) =>
	prevEffectiveDayMap[dayOfWeek];

const monthString = (date: Date) =>
	date.toLocaleString('cs-CZ', { month: 'long' });

function lastMonthWithYear(date: Date = new Date()) {
	date.setDate(1);
	date.setMonth(date.getMonth() - 1);
	const lastMonth = monthString(date);

	return `${lastMonth} ${date.getFullYear()}`;
}
