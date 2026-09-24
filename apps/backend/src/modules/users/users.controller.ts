/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response } from 'express';
import * as usersService from './users.service.js';
import * as permissionsService from './permissions.service.js';
import { UserError } from '../../errors/UserError.js';

export async function getUsersContoller(req: Request, res: Response) {
	try {
		const requestingUser = req.user;

		const users = await usersService.getUsersThatUserCanManage(requestingUser);
		const roles = await usersService.getRolesThatUserCanSet(requestingUser);
		const customers = await usersService.getCustomerCompanies(requestingUser);

		res.json({ users, roles, customers });
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ message: 'Failed to get users', details: err.message });
	}
}

export async function addUserController(req: Request, res: Response) {
	try {
		const user = await usersService.addUser(req.body);
		res.json(user);
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ message: 'Failed to add user', details: err.message });
	}
}

export async function deleteUserController(req: Request, res: Response) {
	try {
		const { id } = req.params;
		const sessionUser = req.user;

		const user = await usersService.deleteUser(
			id,
			sessionUser.role,
			sessionUser.id,
		);

		res.json(user);
	} catch (err) {
		console.error(err);
		if (err instanceof UserError) {
			return res.status(err.statusCode).json({ message: err.message });
		}

		res.status(500).json({
			message: 'Nepodařilo se smazat uživatele',
			details: err.message,
		});
	}
}

export async function updateUserPermissionsController(
	req: Request,
	res: Response,
) {
	try {
		const { id } = req.params;
		const permissionToSet = req.body;

		const result = await permissionsService.setUserPermissionsTo(
			id,
			permissionToSet,
		);

		res.json({ result });
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: 'Nepodařilo se upravit práva uživatela',
			details: err.message,
		});
	}
}
