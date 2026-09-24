/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import multer from 'multer';
import path from 'path';
import fs from 'node:fs';

// CWD -> /app/apps/backend (in container)
export const tariffsUploadDir = path.join(process.cwd(), 'uploads/tariffs');

// this check will run on every import of this file
if (!fs.existsSync(tariffsUploadDir)) {
	fs.mkdirSync(tariffsUploadDir, { recursive: true });
}

const tariffsStorage = multer.diskStorage({
	destination: tariffsUploadDir,
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}.xlsx`); // we dont need to store exactly the name of uploaded file in fs, we will store originalname in database
	},
});

export const uploadTariff = multer({ storage: tariffsStorage });

const MAX_ORDER_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

export const uploadToMemory = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_ORDER_FILE_SIZE },
});
