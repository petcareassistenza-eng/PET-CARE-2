// src/config.ts
export const config = {
  port: process.env.PORT || 8080,
  env: process.env.NODE_ENV || 'development',

  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
  paypalSecret: process.env.PAYPAL_SECRET || '',
  paypalApi: process.env.PAYPAL_API || 'https://api-m.sandbox.paypal.com',
  paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID || '',

  backendBaseUrl: process.env.BACKEND_BASE_URL || 'http://localhost:8080',
  webBaseUrl: process.env.WEB_BASE_URL || 'http://localhost:52000'
};
