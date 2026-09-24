/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Request, Response } from 'express';
import * as authService from './auth.service.js';
import { getAuthTokenCookie } from '../../utils/authToken.js';

const code = { BAD_CREDENTIALS: 0, SERVER_ERROR: 1 };

export async function loginController(req: Request, res: Response) {
	try {
		const { username, password } = req.body;

		const { user, token } = await authService.login(username, password);

		if (!user) return res.status(404).json({ code: code.BAD_CREDENTIALS });

		// set httpOnly cookie
		res.cookie('authToken', token, {
			httpOnly: true,
			secure: true,
			sameSite: 'Strict',
		});

		// send user details
		return res.json(user);
	} catch (err) {
		console.log('/login error\n', err);
		res.status(500).json({ code: code.SERVER_ERROR });
	}
}

export async function checkAuthController(req: Request, res: Response) {
	try {
		const token = getAuthTokenCookie(req);

		// checkAuth throws error if the token is not valid, which will be catched in the catch block here
		const user = await authService.checkAuth(token);
		if (!user) throw new Error('User does not exist');

		// send user details
		return res.json(user);
	} catch (err) {
		return res.status(401).json({ error: err?.message });
	}
}

export async function logoutController(req: Request, res: Response) {
	// clear token stored as cookie
	res.clearCookie('authToken').json({ success: true });
}
