/**
 * CORS Allowlist Middleware (Stage-Aware)
 * 
 * Automatically selects appropriate CORS origins based on deployment stage:
 * - Production: Uses CORS_ORIGINS_PROD or CORS_ORIGINS
 * - Staging: Uses CORS_ORIGINS_STAGING
 * - Development: Allows all origins (no restrictions)
 * 
 * Stage Detection:
 * 1. Explicit STAGE environment variable (production/staging)
 * 2. Fallback to NODE_ENV (production → production stage)
 * 3. Default to staging for safety
 */

import cors from 'cors';

// ============================================================================
// Stage Detection
// ============================================================================

/**
 * Determine current deployment stage
 * Priority: STAGE env var > NODE_ENV mapping > default to staging
 */
const STAGE =
  process.env.STAGE ||
  (process.env.NODE_ENV === 'production' ? 'production' : 'staging');

console.log(`🌍 CORS Stage: ${STAGE}`);

// ============================================================================
// Origin Allowlist Configuration
// ============================================================================

/**
 * Parse comma-separated origins from environment variable
 */
function parseOrigins(envVar: string | undefined): string[] {
  return (envVar || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Stage-specific origin mappings
 */
const originsByStage: Record<string, string[]> = {
  // Staging origins (develop branch)
  staging: parseOrigins(process.env.CORS_ORIGINS_STAGING),

  // Production origins (main branch)
  production: parseOrigins(
    process.env.CORS_ORIGINS_PROD || process.env.CORS_ORIGINS,
  ),

  // Development origins (local dev)
  development: [], // Empty = allow all
};

// Get origins for current stage
const allowedOrigins = originsByStage[STAGE] ?? originsByStage.staging;

// Log configuration for debugging
if (allowedOrigins.length > 0) {
  console.log(`✅ CORS Allowlist (${STAGE}):`, allowedOrigins);
} else {
  console.log(`⚠️ CORS Allowlist (${STAGE}): ALL ORIGINS ALLOWED (development mode)`);
}

// ============================================================================
// CORS Middleware
// ============================================================================

/**
 * CORS middleware with stage-aware origin validation
 * 
 * Behavior:
 * - No origin header (mobile apps) → Always allow
 * - Empty allowlist (dev) → Allow all
 * - Origin in allowlist → Allow
 * - Otherwise → Block with CORS error
 */
export const corsAllowlist = cors({
  origin(origin, callback) {
    // Case 1: No origin header (mobile apps, curl, Postman, native requests)
    if (!origin) {
      return callback(null, true);
    }

    // Case 2: No allowlist configured (development mode - allow all)
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    // Case 3: Origin is in allowlist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Case 4: Origin not allowed
    console.warn(`🚫 CORS blocked (${STAGE}): ${origin}`);
    console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
    callback(new Error('Not allowed by CORS'));
  },

  // Enable credentials (cookies, authorization headers)
  credentials: true,

  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],

  // Expose headers to client
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],

  // Preflight cache duration (seconds)
  maxAge: 86400, // 24 hours
});
