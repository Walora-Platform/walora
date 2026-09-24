/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import prisma from '../../config/prisma.js';
import { Role } from '../../config/generated/prisma-client/enums.js';
import {
	defaultPermissionsByRole,
	getAvailablePermissionsByRole,
	mandatoryPermissionsByRole,
	PermissionKey,
} from './permissions.config.js';

type CreateUserInput = {
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	password: string;
	role: Role;
	customerCompanyId?: string;
};

async function createUserWithPermissions(input: CreateUserInput) {
	return prisma.$transaction(async (tx) => {
		// create user
		const user = await tx.user.create({
			data: {
				username: input.username,
				email: input.email,
				firstName: input.firstName,
				lastName: input.lastName,
				passwordHash: await bcrypt.hash(input.password, 10),
			},
		});

		// get default permissions for that role
		const permissions = await getDefaultPermissionsForRole(input.role);

		// assign default permissions
		if (permissions.length > 0) {
			await tx.userPermission.createMany({
				data: permissions.map((p) => ({
					userId: user.id,
					permissionId: p.id,
				})),
			});
		}

		return user;
	});
}

// returns user permissions
async function getDefaultPermissionsForRole(role: Role) {
	return prisma.permission.findMany({
		where: {
			key: {
				in: defaultPermissionsByRole[role] as string[],
			},
		},
	});
}

// returns array of permissions keys: ["DASHBOARD", "ANOTHER_PERMISSION", ...]
export async function getUserPermissions(userId: string) {
	const permissions = await prisma.userPermission.findMany({
		where: { userId },
		include: {
			permission: true,
		},
	});

	return permissions.map((p) => p.permission.key);
}

export async function setUserPermissionsTo(
	userId: string,
	permissionToSet: PermissionKey[],
) {
	// get user +  existing user's permissions
	const [user, existing] = await Promise.all([
		prisma.user.findUnique({
			where: { id: userId },
			select: { role: true },
		}),
		prisma.userPermission.findMany({
			where: { userId },
			include: { permission: { select: { key: true } } },
		}),
	]);

	if (!user) throw new Error('user not found');

	// available permissions
	const available = new Set(getAvailablePermissionsByRole(user.role));

	// MANDATORY PERMISSIONS
	const mandatory = new Set(mandatoryPermissionsByRole[user.role]);

	// filter permissions to only available to user
	const filteredPermissions = (permissionToSet ?? []).filter((key) =>
		available.has(key),
	);

	// final permissions (filtered + mandatory)
	const finalPermissions = new Set([...filteredPermissions, ...mandatory]);

	const existingKeys = new Set(existing.map((p) => p.permission.key));

	// diffs
	const toAdd = [...finalPermissions].filter((key) => !existingKeys.has(key));
	const toRemoveIds = existing
		.filter((p) => !finalPermissions.has(p.permission.key))
		.map((p) => p.permissionId);

	// check if anything changed
	if (toAdd.length === 0 && toRemoveIds.length === 0) {
		return 'Nothing changed';
	}

	// get ids for toAdd permissions
	const permissions = await prisma.permission.findMany({
		where: { key: { in: toAdd } },
		select: { id: true, key: true },
	});

	const permissionKeyToIdMap = Object.fromEntries(
		permissions.map((p) => [p.key, p.id]),
	);

	await prisma.$transaction([
		prisma.userPermission.createMany({
			data: toAdd.map((key) => ({
				userId,
				permissionId: permissionKeyToIdMap[key],
			})),
		}),
		prisma.userPermission.deleteMany({
			where: {
				userId,
				permissionId: { in: toRemoveIds },
			},
		}),
	]);

	return "Successfully updated user's permissions";
}
