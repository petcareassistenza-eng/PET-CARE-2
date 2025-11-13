/**
 * PayPal SDK Client Configuration
 * 
 * Gestisce l'inizializzazione del client PayPal Checkout SDK
 * con supporto per ambienti Sandbox e Live
 */

import * as checkout from '@paypal/checkout-server-sdk';

/**
 * Crea e restituisce un client PayPal configurato
 * 
 * Environment detection:
 * - PP_ENV=live → PayPal Live Environment
 * - PP_ENV=sandbox (default) → PayPal Sandbox Environment
 * 
 * Required environment variables:
 * - PP_CLIENT_ID: PayPal application client ID
 * - PP_SECRET: PayPal application secret
 * - PP_ENV: Environment (sandbox | live)
 * 
 * @returns PayPalHttpClient configurato per API calls
 * 
 * @example
 * const client = paypalClient();
 * const request = new OrdersCreateRequest();
 * const response = await client.execute(request);
 */
export function paypalClient(): checkout.core.PayPalHttpClient {
  // Validazione variabili ambiente
  const clientId = process.env.PP_CLIENT_ID;
  const secret = process.env.PP_SECRET;
  const envType = process.env.PP_ENV || 'sandbox';

  if (!clientId || !secret) {
    throw new Error(
      'Missing PayPal credentials: PP_CLIENT_ID and PP_SECRET required',
    );
  }

  // Selezione environment
  let environment: checkout.core.SandboxEnvironment | checkout.core.LiveEnvironment;

  if (envType === 'live') {
    console.log('🔴 PayPal: Using LIVE environment');
    environment = new checkout.core.LiveEnvironment(clientId, secret);
  } else {
    console.log('🟡 PayPal: Using SANDBOX environment');
    environment = new checkout.core.SandboxEnvironment(clientId, secret);
  }

  return new checkout.core.PayPalHttpClient(environment);
}

/**
 * Helper: Formatta errori PayPal per logging
 */
export function formatPayPalError(error: any): string {
  if (error.statusCode) {
    return `PayPal Error ${error.statusCode}: ${JSON.stringify(error.message || error)}`;
  }
  return `PayPal Error: ${error.message || 'Unknown error'}`;
}

/**
 * Helper: Estrae approval URL da response PayPal
 */
export function extractApprovalUrl(links: any[]): string | null {
  const approveLink = links?.find((link) => link.rel === 'approve');
  return approveLink?.href || null;
}
