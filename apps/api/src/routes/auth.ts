import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db';
import { config } from '../config';
import { HttpError } from '../utils/httpError';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/async';

const router = Router();
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await query('SELECT id, email, full_name, role, password_hash FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) throw new HttpError(401, 'Invalid email or password');
  const payload = { id: user.id, email: user.email, fullName: user.full_name, role: user.role };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });
  res.json({ success: true, token, user: payload });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
}));

export default router;
