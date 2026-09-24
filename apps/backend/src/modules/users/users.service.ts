/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Role } from '../../config/generated/prisma-client/enums.js';
import prisma from '../../config/prisma.js';
import bcrypt from 'bcrypt';
import {
	buildPermissionsMap,
	defaultPermissionsByRole,
} from './permissions.config.js';
import { UserError } from '../../errors/UserError.js';
import HTTP from '../../utils/constants/httpCodes.js';

export async function getUsersThatUserCanManage(user) {
	if (!user) throw new Error('user not provided');

	// ADMIN
	if (user.role === 'ADMIN') {
		const users = await prisma.user.findMany({
			omit: {
				passwordHash: true,
				customerCompanyId: true,
			},
			include: {
				customerCompany: true,
				permissions: {
					select: {
						permission: {
							select: {
								key: true,
							},
						},
					},
				},
			},
		});

		const mappedUsersWithPermissions = users.map((user) => {
			const userPermissions = user.permissions.map((p) => p.permission.key);

			// user data + his permissions mapped for frontend (see buildPermissionsMap())
			return {
				...user,
				permissions: buildPermissionsMap(user.role, userPermissions),
			};
		});

		return mappedUsersWithPermissions;
	}
}

export async function getRolesThatUserCanSet(user) {
	if (!user) throw new Error('user not provided');

	// ADMIN
	if (user.role === 'ADMIN') {
		return Role;
	}
}

export async function getCustomerCompanies(user) {
	if (!user) throw new Error('user not provided');

	// ADMIN
	if (user.role === 'ADMIN') {
		return await prisma.customerCompany.findMany({
			select: {
				id: true,
				code: true,
			},
		});
	}
}

export async function addUser(userData) {
	if (!userData) throw new Error('user data not provided');
	if (!userData.password) throw new Error('user password not provided');

	userData.passwordHash = await createPasswordHash(userData.password);
	delete userData.password;

	// customer account
	if (userData.customerCompany)
		userData.customerCompanyId = userData.customerCompany.id;
	// provider account (customerCompany is null in userData)
	else userData.customerCompanyId = null;

	// database doesnt hold customerCompany on the 'user' table (it holds customerCompanyId)
	delete userData.customerCompany;

	const result = await prisma.$transaction(async (tx) => {
		const user = await prisma.user.create({
			data: userData,
			select: {
				id: true,
			},
		});

		await giveDefaultPermissionsForRole(userData.role, user.id);
		return true;
	});

	return result;
}

const createPasswordHash = async (password) => {
	return await bcrypt.hash(password, 10);
};

const giveDefaultPermissionsForRole = async (role: Role, id: string) => {
	if (!role) throw new Error('role not provided');
	for (const key of defaultPermissionsByRole[role]) {
		const permission = await prisma.permission.findUnique({
			where: { key },
		});

		if (!permission) continue;

		await prisma.userPermission.create({
			data: {
				userId: id,
				permissionId: permission.id,
			},
		});
	}
};

export async function deleteUser(
	id: string,
	role: Role,
	requestingUserId: string,
) {
	if (!id) throw new Error('id not provided');

	const foundUser = await prisma.user.findUnique({
		where: { id },
		select: { id: true },
	});

	if (foundUser.id === requestingUserId) {
		throw new UserError('Nemůžete smazat svůj účet', HTTP.TEAPOT);
	}

	if (role === 'ADMIN') {
		await Promise.all([
			deleteUserPermissions(id),
			prisma.user.delete({
				where: { id },
			}),
		]);
	}
}

const deleteUserPermissions = async (userId) => {
	if (!userId) throw new Error('userId not specified');

	await prisma.userPermission.deleteMany({
		where: { userId },
	});
};

//import { sendWelcomeEmail } from './services/emailService.js';

/* app.post('/user/add', async (req, res) => {
	try {
		const { email, name } = req.body;

		const user = await prisma.user.create({
			data: { email, name },
		});

		await sendWelcomeEmail(user.id, user.email, user.name);

		res.json({ success: true, user });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to create user' });
	}
}); */
