/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { emailQueue } from '../queues/index.js'

export async function sendWelcomeEmail(userId: string, email: string, name: string) {
	// add job to queue
	const job = await emailQueue.add('welcome-email', {
		userId,
		email,
		name,
		timestamp: new Date().toISOString()
	})

	console.log(`Welcome email job added: ${job.id}`)
	return job
}

export async function sendPasswordResetEmail(userId: string, email: string, resetToken: string) {
	const job = await emailQueue.add('password-reset', {
		userId,
		email,
		resetToken,
		timestamp: new Date().toISOString()
	})
	
	console.log(`Password reset email job added: ${job.id}`)
	return job
}