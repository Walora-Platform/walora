/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Prisma } from '../../config/generated/prisma-client/client.js';
import prisma from '../../config/prisma.js';
import { RequestError } from '../../errors/RequestError.js';

export async function getCarriers(query) {
	const page = Number(query.page ?? 0);
	const pageSize = Number(query.pageSize ?? 20);

	const [data, total] = await prisma.$transaction([
		prisma.carrier.findMany({
			select: {
				id: true,
				name: true,
				mobileNumber: true,
				email: true,
				notes: true,
			},
			take: pageSize,
			skip: page * pageSize,
			orderBy: { name: 'asc' },
		}),
		prisma.carrier.count(),
	]);

	return { data, total };
}

export async function getCarriersReduced() {
	return await prisma.carrier.findMany({
		select: {
			id: true,
			name: true,
		},
	});
}

export async function getCarrierProfile(id) {
	if (!id) {
		throw new RequestError('Pro získaní dopravce je nutné zadat jeho id');
	}

	const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

	const [
		carrier,
		parcelsInTransport,
		deliveredParcelsThisYear,
		deliveredPalletsThisYear,
	] = await prisma.$transaction([
		// carrier
		prisma.carrier.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				mobileNumber: true,
				email: true,
				notes: true,
			},
		}),

		// parcelsInTransport
		prisma.parcel.count({
			where: {
				selectedCarrierId: id,
				status: {
					in: ['PLANNED', 'LOADED'],
				},
			},
		}),

		// deliveredParcelsThisYear
		prisma.parcel.count({
			where: {
				selectedCarrierId: id,
				status: {
					in: ['DELIVERED', 'CLOSED'],
				},
				deliveryDate: {
					gte: currentYearStart,
				},
			},
		}),

		//deliveredPalletsThisYear
		prisma.parcel.aggregate({
			where: {
				selectedCarrierId: id,
				status: {
					in: ['DELIVERED', 'CLOSED'],
				},
				deliveryDate: {
					gte: currentYearStart,
				},
			},
			_sum: {
				palletsCount: true,
			},
		}),
	]);

	if (!carrier) {
		throw new RequestError('Dopravce nebyl nalezen', 404);
	}

	return {
		...carrier,
		kpi: {
			parcelsInTransport,
			deliveredParcelsThisYear,
			deliveredPalletsThisYear: deliveredPalletsThisYear._sum.palletsCount ?? 0,
		},
	};
}

interface InputCarrier {
	name: string;
	email?: string;
	mobileNumber?: string;
	notes?: string;
}
export async function addCarrier(input: InputCarrier) {
	const name = input.name.trim();
	const email = input.email?.trim();
	const mobileNumber = input.mobileNumber?.trim();
	const notes = input.notes?.trim();

	if (!name) {
		throw new RequestError('Pro vytvoření dopravce je nutné zadat jeho název');
	}

	// name unique validation
	const c = await prisma.carrier.findUnique({ where: { name } });
	if (c) throw new RequestError('Dopravce s tímto názvem již existuje');

	await prisma.carrier.create({
		data: {
			name,
			email,
			mobileNumber,
			notes,
		},
	});
}

export async function patchCarrier(id: string, input: InputCarrier) {
	const name = input.name.trim();
	const email = input.email?.trim();
	const mobileNumber = input.mobileNumber?.trim();
	const notes = input.notes?.trim();

	if (!name) {
		throw new RequestError(
			'Pro úpravu dopravce je nutné zadat jeho nový název',
		);
	}

	// name unique validation
	const existingCarrierWithName = await prisma.carrier.findFirst({
		where: { name, id: { not: id } },
		select: { name: true },
	});

	if (existingCarrierWithName) {
		throw new RequestError(`Dopravce s tímto názvem již existuje`);
	}

	await prisma.carrier.update({
		where: { id },
		data: {
			name,
			email,
			mobileNumber,
			notes,
		},
	});
}

export async function deleteCarrier(id: string) {
	if (!id) {
		throw new RequestError('Pro smazání dopravce je nutné definovat jeho id');
	}

	try {
		await prisma.carrier.delete({ where: { id } });
	} catch (err) {
		console.error(err.message);

		if (
			err instanceof Prisma.PrismaClientKnownRequestError &&
			err.code === 'P2003'
		) {
			throw new RequestError(
				'Dopravce nelze smazat, protože je navázán na další záznamy v systému (zásilky, tarify, ...)',
			);
		}

		if (
			err instanceof Prisma.PrismaClientKnownRequestError &&
			err.code === 'P2025'
		) {
			throw new RequestError('Doprave nebyl nalezen', 404);
		}

		// error is different and will be catched in globalErrorHandler
		throw err;
	}
}
