// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { adminAuth, db } from '../firebase';

export interface AuthUser {
  uid: string;
  role?: 'owner' | 'pro' | 'admin';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await adminAuth.verifyIdToken(token);

    // ruolo da custom claims o da Firestore
    let role = (decoded.role as AuthUser['role']) || undefined;
    if (!role) {
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      role = (userDoc.data()?.role as AuthUser['role']) || 'owner';
    }

    req.user = { uid: decoded.uid, role };
    next();
  } catch (err) {
    console.error('Auth error', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}
