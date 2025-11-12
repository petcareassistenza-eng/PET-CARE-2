/**
 * Request Validation & Sanitization Middleware
 * Handles validation errors and basic input sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Validates request using express-validator rules
 * Returns 422 JSON response if validation fails
 */
export function validateRequest(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(422).json({
      ok: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({
        field: e.type === 'field' ? e.path : e.type,
        message: e.msg,
        value: e.type === 'field' ? (e as any).value : undefined,
      })),
    });
  }
  
  return next();
}

/**
 * Sanitization middleware - trims string values from req.body, req.query, req.params
 * Prevents whitespace-related security issues
 */
export function trimStrings(req: Request, _res: Response, next: NextFunction) {
  const sanitize = (obj: any): void => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string') {
        obj[k] = v.trim();
      } else if (typeof v === 'object' && v !== null) {
        sanitize(v);
      }
    }
  };
  
  // Sanitize all input sources
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  
  next();
}
