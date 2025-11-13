/**
 * Coupon Validation Router
 * 
 * Endpoint: GET /api/coupons/:code
 * Valida codici coupon FREE-1M/3M/12M per abbonamenti PRO
 */

import { Router, Request, Response } from 'express';
import { zodValidate } from '../middleware/zodValidate.js';
import { couponParams, findCoupon } from '../schemas/coupons.js';
// import { requireAuth } from '../middleware/requireAuth.js';

const r = Router();

/**
 * GET /api/coupons/:code
 * 
 * Verifica validità di un coupon e restituisce i dettagli
 * 
 * @example
 * GET /api/coupons/FREE-3M
 * 
 * Response 200:
 * {
 *   ok: true,
 *   data: {
 *     code: "FREE-3M",
 *     months: 3,
 *     active: true,
 *     description: "3 mesi di abbonamento PRO gratuito"
 *   }
 * }
 * 
 * Response 404:
 * {
 *   ok: false,
 *   message: "Invalid or expired coupon"
 * }
 */
r.get(
  '/:code',
  // requireAuth, // Uncomment to require authentication
  zodValidate({ params: couponParams }),
  async (req: Request, res: Response) => {
    try {
      const code = req.params.code.toUpperCase();
      
      // Cerca coupon nella lista statica
      const coupon = findCoupon(code);
      
      if (!coupon) {
        return res.status(404).json({
          ok: false,
          message: 'Invalid or expired coupon',
        });
      }

      // Coupon valido
      return res.json({
        ok: true,
        data: coupon,
      });
    } catch (error) {
      console.error('Coupon validation error:', error);
      return res.status(500).json({
        ok: false,
        message: 'Internal server error',
      });
    }
  },
);

/**
 * Future expansion: POST /api/coupons/:code/apply
 * Applica coupon a un utente PRO e aggiorna subscription metadata
 */

export default r;
