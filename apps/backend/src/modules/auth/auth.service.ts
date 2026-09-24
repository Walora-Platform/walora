/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';
import { getUserPermissions } from '../users/permissions.service.js';

// returns { user: {user details object} | null, token: {token object} | null }
export async function login(username: string, password: string) {
	// find user
	const user = await prisma.user.findUnique({
		where: {
			username: username,
		},
		include: {
			customerCompany: { select: { id: true, code: true, name: true } },
		},
		omit: {
			customerCompanyId: true,
		},
	});

	if (!user) return { user: null, token: null };

	// compare password
	const valid = await bcrypt.compare(password, user.passwordHash);
	if (!valid) return { user: null, token: null };

	// delete passwordHash value from user object
	delete user.passwordHash;

	// get user permissions
	user.permissions = await getUserPermissions(user.id);

	// create token
	const token = jwt.sign(
		{
			id: user.id,
			role: user.role,
			permissions: user.permissions,
			customerCompanyId: user.customerCompany?.id ?? null,
		},
		process.env.JWT_SECRET_KEY,
		{ expiresIn: '8h' },
	);

	return { user: user, token: token };
}

// CALL INSIDE TRY CATCH BLOCK (jwt.verify() throws error if token not valid)
// returns: { user details object } | null
export async function checkAuth(token: string) {
	// decode token (throws error if token not valid)
	const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

	// find the user
	const user = await prisma.user.findUnique({
		where: {
			id: decoded.id,
		},
		include: {
			customerCompany: { select: { id: true, code: true, name: true } },
		},
		omit: {
			passwordHash: true,
			customerCompanyId: true,
		},
	});

	if (!user) return null;

	// get user permissions
	user.permissions = await getUserPermissions(user.id);

	return user;
}
