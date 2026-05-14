import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JWTPayload;
    (req as Request & { user: JWTPayload }).user = payload;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as never,
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret') as JWTPayload;
  } catch {
    return null;
  }
}
