/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Redis } from 'ioredis'

const redisConnection = new Redis({
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT as number | undefined,
	maxRetriesPerRequest: null
})

redisConnection.on('error', (err) => {
	console.error('Redis connection error:', err)
})

redisConnection.on('connect', () => {
	console.log('Connected to Redis')
})

export default redisConnection