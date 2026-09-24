/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import emailWorker from './workers/emailWorker';
import parcelsWorker from './workers/parcelsWorker';
import documentsWorker from './workers/documentsWorker';
import tariffsWorker from './workers/tariffsWorker';
import billingWorker from './workers/billingWorker';

console.log('Worker started, listening for jobs');

process.on('SIGTERM', async () => {
	console.log('Shutting down workers');

	// close workers
	await emailWorker.close();
	await parcelsWorker.close();
	await documentsWorker.close();
	await tariffsWorker.close();
	await billingWorker.close();

	process.exit(0);
});

process.on('SIGINT', async () => {
	console.log('Shutting down workers');

	// close workers
	await emailWorker.close();
	await parcelsWorker.close();
	await documentsWorker.close();
	await tariffsWorker.close();
	await billingWorker.close();

	process.exit(0);
});
