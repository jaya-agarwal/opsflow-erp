import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: err.flatten().fieldErrors });
  }
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, details: err.details });
  }
  if (process.env.NODE_ENV !== 'test') console.error(err);
  return res.status(500).json({ success: false, message: 'Unexpected server error' });
}
