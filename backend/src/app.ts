/**
 * MyPetCare Express Application Setup
 * Separates app configuration from server startup for testing
 * Updated with Zod validation, rate limiting, and improved middleware structure
 */

import bodyParser from 'body-parser';
import compression from 'compression';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import xss from 'xss-clean';

import { corsAllowlist } from './middleware/corsAllowlist';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler';
import {
  apiLimiter,
  authLimiter,
  adminLimiter,
} from './middleware/rateLimit';
import { trimStrings } from './middleware/validateRequest';
import { handlePaypalWebhook } from './functions/paypalWebhook';
import { handleStripeWebhook } from './webhooks/stripeWebhook';

// Routers
import adminRouter from './routes/admin';
import authRouter from './routes/auth.routes';
import bookingsRouter from './routes/booking.routes';
import gdprRouter from './routes/gdpr';
import healthRouter from './routes/health';
import internalRouter from './routes/internal';
import jobsRouter from './routes/jobs';
import messagesRouter from './routes/messages';
import paymentsRouter from './routes/payments.routes';
import prosRouter from './routes/pros';
import reviewsRouter from './routes/reviews.routes';
import suggestionsRouter from './routes/suggestions.routes';
import swaggerRouter from './docs/swagger';
import testRouter from './routes/test';

// ==========================================
// Express App Configuration
// ==========================================

export const app = express();

// Trust proxy (required for rate limiting behind Cloud Run/Load Balancer)
app.set('trust proxy', 1);

// ==========================================
// Webhook Endpoints (MUST be before express.json())
// ==========================================
// Stripe requires raw body for signature verification

app.post(
  '/api/payments/webhook',
  bodyParser.raw({ type: 'application/json' }),
  (req, _res, next) => {
    // Store raw body for Stripe signature verification
    (req as any).rawBody = req.body;
    next();
  },
  handleStripeWebhook,
);

// PayPal webhook
app.post(
  '/webhooks/paypal',
  bodyParser.json(),
  handlePaypalWebhook,
);

// ==========================================
// Security & Performance Middleware
// ==========================================

// CORS with allowlist
app.use(corsAllowlist);

// Parse JSON bodies (for all other routes)
app.use(express.json());

// Helmet - Security headers
app.use(helmet());

// XSS Protection
app.use(xss() as any);

// Compression - Gzip/Brotli
app.use(compression());

// Trim strings from all inputs
app.use(trimStrings);

// ==========================================
// Health, Readiness, Version Endpoints (no authentication)
// ==========================================

app.use('/', healthRouter);

// Test routes (Firebase connectivity, diagnostics)
app.use('/test', testRouter);

// ==========================================
// API Documentation (Swagger UI)
// ==========================================

// Enable docs based on environment
// Production: Only if ENABLE_DOCS=true is set explicitly
// Non-production: Always enabled for development convenience
const shouldEnableDocs =
  process.env.ENABLE_DOCS === 'true' || process.env.NODE_ENV !== 'production';

if (shouldEnableDocs) {
  app.use('/docs', swaggerRouter);
  console.log(
    `📚 API Documentation enabled at /docs (mode: ${process.env.NODE_ENV === 'production' ? 'read-only' : 'interactive'})`,
  );
} else {
  console.log('📚 API Documentation disabled (set ENABLE_DOCS=true to enable)');
}

// ==========================================
// Rate Limiting (applied to API routes)
// ==========================================

// General API rate limiter
app.use('/api', apiLimiter);

// ==========================================
// API Routes
// ==========================================

// Authentication routes (with stricter rate limit)
app.use('/api/auth', authLimiter, authRouter);

// Booking routes
app.use('/api/bookings', bookingsRouter);

// Reviews routes
app.use('/api/reviews', reviewsRouter);

// Payment routes (handled in payments.routes.ts with paymentsLimiter)
app.use('/api/payments', paymentsRouter);

// Suggestions routes
app.use('/api/suggestions', suggestionsRouter);

// GDPR routes (data export & deletion)
app.use('/api', gdprRouter);

// PRO routes (with cache & geosearch)
app.use('/api/pros', prosRouter);

// Admin routes (with admin rate limiter)
app.use('/admin', adminLimiter, adminRouter);

// Jobs routes (CRON protected)
app.use('/jobs', jobsRouter);

// Messages/Chat routes
app.use('/messages', messagesRouter);

// Internal routes (cache management & monitoring)
app.use('/api', internalRouter);

// ==========================================
// Error Handling
// ==========================================

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);
