/**
 * Authentication Middleware
 * 
 * Verifies Firebase ID tokens and attaches user info to request
 */

import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        role?: string;
        emailVerified?: boolean;
      };
    }
  }
}

/**
 * Require Authentication Middleware
 * 
 * Extracts Bearer token from Authorization header
 * Verifies Firebase ID token
 * Attaches user info to req.user
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Fetch user custom claims (role)
    const userRecord = await admin.auth().getUser(decodedToken.uid);
    const customClaims = userRecord.customClaims || {};

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: customClaims.role as string || 'owner',
      emailVerified: decodedToken.email_verified,
    };

    next();

  } catch (error: any) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      error: 'Invalid or expired token',
      message: error.message,
    });
  }
}

/**
 * Require Role Middleware
 * 
 * Restricts access to specific roles (admin, pro, owner)
 * 
 * Usage:
 * router.get('/admin/stats', requireRole('admin'), handler);
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role || 'owner';

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Requires one of: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Optional Authentication Middleware
 * 
 * Attaches user info if token is present, but doesn't require it
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, continue without user info
      next();
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const userRecord = await admin.auth().getUser(decodedToken.uid);
    const customClaims = userRecord.customClaims || {};

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: customClaims.role as string || 'owner',
      emailVerified: decodedToken.email_verified,
    };

    next();

  } catch (error) {
    // Token invalid, continue without user info
    next();
  }
}
