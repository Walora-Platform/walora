/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import mysql from 'mysql2/promise';
import { ApiServiceUnavailableError } from '../errors/extApi/ApiServiceUnavailableError.js';

/* returns array of sequence nums */
export async function allocateBulk(count: number): string[] {
	let connection;

	try {
		connection = await connectToDB();

		const sequenceNums = [];

		for (let i = 0; i < count; i++) {
			const [rows] = await connection.execute(
				'SELECT NEXT VALUE FOR id_seq AS id;',
			);
			sequenceNums.push(rows[0].id);
		}

		return sequenceNums;
	} catch (err) {
		console.error('sequenceService.allocateBulk:', err);
		throw new ApiServiceUnavailableError();
	} finally {
		if (connection) await connection.end();
	}
}

async function connectToDB() {
	return mysql.createConnection({
		host: process.env.SEQUENCE_DB_HOST,
		user: process.env.SEQUENCE_DB_USER,
		password: process.env.SEQUENCE_DB_PASSWORD,
		database: process.env.SEQUENCE_DB_NAME,
	});
}
