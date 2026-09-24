import type { Request, Response, NextFunction } from 'express';
import { RequestError } from '../errors/RequestError.js';

export function globalErrorHandler(
	err: unknown,
	req: Request,
	res: Response,
	next: NextFunction,
) {
	console.error(err);

	if (res.headersSent) {
		return next(err);
	}

	/* TODO: handle more instances of error that can happen */
	if (err instanceof RequestError) {
		const errors = err.errors;
		const message = errors?.length ? err.message : 'Došlo k chybě';
		const details = errors?.length ? errors.join('\n') : err.message;

		return res.status(err.statusCode).json({ message, details });
	}

	return res.status(500).json({
		message: 'Došlo k neočekávané chybě na straně serveru',
	});
}
