/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import prisma from './prisma.js';
import bcrypt from 'bcrypt';
import { permissions } from '../modules/users/permissions.config.js';
import type PermissionKey from '../modules/users/permissions.config.js';

async function seed() {
	// PERMISSIONS
	// does NOT delete permissions, only creates new ones or updates scope on the existing ones
	for (const permission of permissions) {
		await prisma.permission.upsert({
			where: { key: permission.key },
			update: {
				scope: permission.scope, // updates scope, if changed
			},
			create: permission,
		});
	}
	console.log('SEED: Permissions created/updated.');

	// DEFAULT ADMIN
	const admin = await prisma.user.findUnique({
		where: {
			username: process.env.ADMIN_USERNAME,
		},
	});

	if (!admin) {
		const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

		// create default admin
		const createdAdmin = await prisma.user.create({
			data: {
				username: process.env.ADMIN_USERNAME,
				email: process.env.ADMIN_EMAIL,
				firstName: process.env.ADMIN_FIRST_NAME,
				lastName: process.env.ADMIN_LAST_NAME,
				passwordHash: hash,
				role: 'ADMIN',
			},
		});

		// get all admin permissions
		const adminPermissions = await prisma.permission.findMany({
			where: { scope: 'ADMIN' },
		});

		// add admin permissions to default admin
		await prisma.userPermission.createMany({
			data: adminPermissions.map((permission) => ({
				userId: createdAdmin.id,
				permissionId: permission.id,
			})),
			skipDuplicates: true,
		});

		console.log(
			'SEED: Created admin with username:',
			process.env.ADMIN_USERNAME,
		);
	} else {
		console.log('Did not create admin from seed, admin already exists.');
	}
}

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});
