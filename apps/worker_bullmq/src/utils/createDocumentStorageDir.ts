/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import path from 'path';
import fs from 'fs/promises';

// returns 'documents/YYYY/MM'
export async function createDocumentStorageDir(): string {
	const now = new Date();
	const year = String(now.getFullYear());
	const month = String(now.getMonth() + 1).padStart(2, '0');

	// /app/documents/YYYY/MM
	const storageDir = path.join('/app/documents', year, month);

	await fs.mkdir(storageDir, { recursive: true });
	return storageDir;
}
