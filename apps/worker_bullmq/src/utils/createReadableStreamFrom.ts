/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Readable } from 'stream';

export function createReadableStreamFrom(buffer: Buffer) {
	const bufferStream = new Readable();
	bufferStream.push(buffer);
	bufferStream.push(null); // end to data

	return bufferStream;
}
