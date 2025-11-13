/**
 * Availability & Locks Router
 * 
 * Gestisce la disponibilità slot PRO e il sistema di lock temporanei
 * per prevenire overbooking durante il checkout.
 * 
 * Endpoints:
 * - GET /:proId/availability - Slot disponibili per data
 * - POST /:proId/locks - Crea lock temporaneo (TTL 5min)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getDb } from '../utils/firebaseAdmin.js';
import { genDaySlots, overlap } from '../utils/slots.js';
import { zodValidate } from '../middleware/zodValidate.js';
import { writeLimiter } from '../middleware/rateLimit.js';
// import { requireAuth } from '../middleware/requireAuth.js';

const r = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  stepMin: z.coerce.number().int().min(5).max(120).default(30),
});

const lockBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  start: z.string().datetime({ message: 'Invalid ISO datetime for start' }),
  end: z.string().datetime({ message: 'Invalid ISO datetime for end' }),
  ttlSec: z.coerce.number().int().min(60).max(900).default(300), // 1-15 min TTL
});

// ============================================================================
// GET /:proId/availability
// ============================================================================

/**
 * Restituisce tutti gli slot disponibili per un PRO in una specifica data
 * 
 * Query params:
 * - date: YYYY-MM-DD (required)
 * - stepMin: durata slot in minuti (default 30)
 * 
 * Response:
 * {
 *   ok: true,
 *   data: [
 *     { start: "2025-11-20T09:00:00.000Z", end: "2025-11-20T09:30:00.000Z", status: "free" },
 *     { start: "2025-11-20T09:30:00.000Z", end: "2025-11-20T10:00:00.000Z", status: "locked" },
 *     { start: "2025-11-20T10:00:00.000Z", end: "2025-11-20T10:30:00.000Z", status: "booked" }
 *   ]
 * }
 */
r.get(
  '/:proId/availability',
  zodValidate({ query: querySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { proId } = req.params;
      const { date, stepMin } = req.query as any;
      
      const db = getDb();
      const base = db.collection('calendars').doc(proId);

      // ========================================
      // 1. Calcola regole disponibilità giorno
      // ========================================
      
      // Ottieni weekday (0=domenica, 1=lunedì, ..., 6=sabato)
      const weekday = new Date(date + 'T00:00:00Z').getUTCDay();
      
      // Carica regole ricorrenti per questo weekday
      const rulesSnap = await base
        .collection('rules')
        .where('weekday', '==', weekday)
        .get();
      
      let rules = rulesSnap.docs.map((d) => {
        const data = d.data();
        return { start: data.start as string, end: data.end as string };
      });

      // Gestisci eccezioni specifiche per questa data
      const exceptionsSnap = await base
        .collection('exceptions')
        .where('date', '==', date)
        .get();
      
      exceptionsSnap.docs.forEach((d) => {
        const ex = d.data();
        if (ex.closed) {
          // Giorno completamente chiuso
          rules = [];
        } else if (ex.start && ex.end) {
          // Aggiunge orario extra (apertura straordinaria)
          rules.push({ start: ex.start as string, end: ex.end as string });
        }
      });

      // Genera slot candidati
      const candidates = genDaySlots(date, rules, Number(stepMin));

      // ========================================
      // 2. Raccogli lock attivi e booking esistenti
      // ========================================
      
      const now = Date.now();
      
      // Lock temporanei non scaduti
      const locksSnap = await base.collection('locks').get();
      const activeLocks = locksSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((l) => l.ttl > now);

      // Booking confermati per questa data
      const bookingsSnap = await db
        .collection('bookings')
        .where('proId', '==', proId)
        .where('date', '==', date)
        .get();
      
      const bookings = bookingsSnap.docs.map((d) => d.data());

      // ========================================
      // 3. Determina stato di ogni slot
      // ========================================
      
      const data = candidates.map((startISO) => {
        const endISO = new Date(
          new Date(startISO).getTime() + Number(stepMin) * 60000,
        ).toISOString();

        // Verifica lock
        const isLocked = activeLocks.some((l) =>
          overlap(l.start, l.end, startISO, endISO),
        );

        // Verifica booking (escludi cancellati)
        const isBooked = bookings.some(
          (b: any) =>
            overlap(b.start, b.end, startISO, endISO) &&
            b.status !== 'cancelled',
        );

        return {
          start: startISO,
          end: endISO,
          status: isBooked ? 'booked' : isLocked ? 'locked' : 'free',
        };
      });

      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  },
);

// ============================================================================
// POST /:proId/locks
// ============================================================================

/**
 * Crea un lock temporaneo su uno slot per prevenire double booking
 * 
 * Body:
 * {
 *   date: "2025-11-20",
 *   start: "2025-11-20T09:00:00.000Z",
 *   end: "2025-11-20T09:30:00.000Z",
 *   ttlSec: 300  // TTL in secondi (default 300 = 5 min)
 * }
 * 
 * Response:
 * - 201: { ok: true, id: "lock_xxx", ttl: 1731400000000 }
 * - 409: { ok: false, message: "Slot locked" | "Slot booked" }
 */
r.post(
  '/:proId/locks',
  // requireAuth,
  writeLimiter,
  zodValidate({ body: lockBodySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { proId } = req.params;
      const { date, start, end, ttlSec } = req.body;
      
      const db = getDb();
      const now = Date.now();
      const ttl = now + ttlSec * 1000;

      const base = db.collection('calendars').doc(proId);

      // ========================================
      // 1. Verifica nessun overlap con lock attivi
      // ========================================
      
      const locksSnap = await base.collection('locks').get();
      
      for (const d of locksSnap.docs) {
        const l = d.data() as any;
        // Lock ancora valido?
        if (l.ttl > now && overlap(l.start, l.end, start, end)) {
          return res.status(409).json({
            ok: false,
            message: 'Slot locked by another user',
          });
        }
      }

      // ========================================
      // 2. Verifica nessun overlap con booking confermati
      // ========================================
      
      const bookingsSnap = await db
        .collection('bookings')
        .where('proId', '==', proId)
        .where('date', '==', date)
        .get();
      
      for (const d of bookingsSnap.docs) {
        const b = d.data() as any;
        if (
          b.status !== 'cancelled' &&
          overlap(b.start, b.end, start, end)
        ) {
          return res.status(409).json({
            ok: false,
            message: 'Slot already booked',
          });
        }
      }

      // ========================================
      // 3. Crea lock temporaneo
      // ========================================
      
      const ref = await base.collection('locks').add({
        date,
        start,
        end,
        ttl,
        // by: req.user?.uid || 'anonymous', // Uncomment with requireAuth
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({
        ok: true,
        id: ref.id,
        ttl,
        expiresIn: ttlSec,
      });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
