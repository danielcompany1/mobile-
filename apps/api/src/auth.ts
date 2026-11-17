import type { NextFunction, Request, Response } from 'express';
import { authClient } from './supabase.js';

declare global {
  namespace Express { interface Request { userId?: string; accessToken?: string } }
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in to continue.' });
  const token = authorization.slice(7);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
  req.userId = data.user.id;
  req.accessToken = token;
  return next();
}
