/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import 'dotenv/config';
import { defineConfig, env } from '@prisma/config';

export default defineConfig({
	schema: '../../shared/prisma/schema.prisma',
	migrations: {
		path: '../../shared/prisma/migrations',
		seed:
			env('NODE_ENV') === 'prod'
				? 'node ./src/config/prisma-seed.js'
				: 'tsx ./src/config/prisma-seed.ts',
	},
	datasource: {
		url: env('DATABASE_URL'),
	},
});
