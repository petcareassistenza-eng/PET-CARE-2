import rateLimit from 'express-rate-limit'

/**
 * Rate limiter generico per API pubbliche (100 req/15min)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100,
  message: { ok: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter per endpoint di autenticazione (5 req/15min)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { ok: false, message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter per endpoint GDPR (10 req/ora)
 * GDPR richiede protezione contro abusi ma garantire accesso ragionevole
 */
export const gdprLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ora
  max: 10,
  message: { ok: false, message: 'Too many GDPR requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter per Stripe webhooks (1000 req/ora)
 * Stripe può inviare molti webhook in caso di batch operations
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: { ok: false, message: 'Too many webhook requests.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limit per webhook Stripe verificati
    return req.headers['stripe-signature'] !== undefined
  },
})

/**
 * Rate limiter per operazioni di scrittura (50 req/15min)
 * Protegge endpoint POST/PUT/DELETE
 */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 50,
  message: { ok: false, message: 'Too many write requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter per endpoint pagamenti (30 req/15min)
 * Protegge checkout e transazioni
 */
export const paymentsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { ok: false, message: 'Too many payment requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter per operazioni admin (100 req/15min)
 * Protezione endpoint amministrativi
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { ok: false, message: 'Too many admin requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})
