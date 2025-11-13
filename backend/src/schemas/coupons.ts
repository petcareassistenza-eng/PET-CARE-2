/**
 * Coupon System Schema & Configuration
 * 
 * Definisce i coupon FREE disponibili per abbonamenti PRO:
 * - FREE-1M: 1 mese gratis
 * - FREE-3M: 3 mesi gratis
 * - FREE-12M: 12 mesi gratis
 */

import { z } from 'zod';

/**
 * Validation schema per parametro :code
 */
export const couponParams = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
});

/**
 * Struttura dati coupon
 */
export type CouponInfo = {
  code: string;       // Codice coupon (es: "FREE-3M")
  months: number;     // Durata abbonamento gratuito
  active: boolean;    // Stato attivazione coupon
  description?: string; // Descrizione opzionale
};

/**
 * Lista coupon statici (server-side)
 * 
 * In produzione, questi possono essere mappati a:
 * - Stripe Promotion Codes
 * - PayPal Discount Codes
 * - Custom subscription metadata
 */
export const STATIC_COUPONS: CouponInfo[] = [
  {
    code: 'FREE-1M',
    months: 1,
    active: true,
    description: '1 mese di abbonamento PRO gratuito',
  },
  {
    code: 'FREE-3M',
    months: 3,
    active: true,
    description: '3 mesi di abbonamento PRO gratuito',
  },
  {
    code: 'FREE-12M',
    months: 12,
    active: true,
    description: '12 mesi di abbonamento PRO gratuito (offerta lancio)',
  },
];

/**
 * Helper: Trova coupon per codice
 */
export function findCoupon(code: string): CouponInfo | null {
  const normalized = code.toUpperCase().trim();
  return (
    STATIC_COUPONS.find((c) => c.code === normalized && c.active) || null
  );
}

/**
 * Helper: Calcola data scadenza abbonamento
 */
export function calculateExpiryDate(
  startDate: Date,
  months: number,
): Date {
  const expiry = new Date(startDate);
  expiry.setMonth(expiry.getMonth() + months);
  return expiry;
}
