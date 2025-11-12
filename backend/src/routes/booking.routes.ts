import express from 'express';
import * as admin from 'firebase-admin';

import { logger } from '../logger.js';
import { trimStrings, validateRequest } from '../middleware/validateRequest';
import {
  holdSlot,
  releaseSlot,
  createBooking,
  confirmBooking,
  cancelBooking,
} from '../services/booking.service.js';
import {
  holdSlotValidation,
  releaseSlotValidation,
  createBookingValidation,
  confirmBookingValidation,
} from '../validators/booking.validator';

const router = express.Router();
const db = admin.firestore();

// Middleware to require authentication
async function requireAuth(req: any, res: any, next: any) {
  try {
    const hdr = String(req.headers.authorization || '');
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    const dec = await admin.auth().verifyIdToken(token);
    req.auth = { uid: dec.uid, email: dec.email };
    next();
  } catch (e) {
    logger.warn({ error: e }, 'Authentication failed');
    res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

/**
 * POST /api/bookings/hold
 * Hold a slot before payment (prevents double booking)
 */
router.post('/hold', trimStrings, holdSlotValidation, validateRequest, requireAuth, async (req, res) => {
  try {
    const { proId, dateISO, start, end } = req.body;
    const userId = req.auth.uid;

    if (!proId || !dateISO || !start || !end) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const success = await holdSlot({ proId, dateISO, start, end, userId });

    if (!success) {
      return res.status(409).json({ error: 'SLOT_ALREADY_HELD' });
    }

    res.json({ ok: true, message: 'Slot held for 5 minutes' });
  } catch (error: any) {
    logger.error({ error }, 'Hold slot error');
    res.status(500).json({ error: error.message || 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/bookings/release
 * Release a held slot (if user navigates away)
 */
router.post('/release', trimStrings, releaseSlotValidation, validateRequest, requireAuth, async (req, res) => {
  try {
    const { proId, dateISO, start } = req.body;

    if (!proId || !dateISO || !start) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await releaseSlot(proId, dateISO, start);
    res.json({ ok: true });
  } catch (error: any) {
    logger.error({ error }, 'Release slot error');
    res.status(500).json({ error: error.message || 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/bookings
 * Create a new booking (with pending_payment status)
 */
router.post('/', trimStrings, createBookingValidation, validateRequest, requireAuth, async (req, res) => {
  try {
    const {
      proId,
      serviceName,
      date,
      timeStart,
      timeEnd,
      price,
      appFee,
      discount,
      totalPaid,
      couponCode,
      petIds,
      notes,
    } = req.body;

    const userId = req.auth.uid;

    if (!proId || !serviceName || !date || !timeStart || !timeEnd || !price || !appFee || totalPaid === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate booking ID
    const bookingId = db.collection('bookings').doc().id;

    await createBooking(bookingId, {
      proId,
      userId,
      serviceName,
      date,
      timeStart,
      timeEnd,
      price,
      appFee,
      discount: discount || 0,
      totalPaid,
      status: 'pending_payment',
      couponCode,
      petIds,
      notes,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ ok: true, bookingId });
  } catch (error: any) {
    logger.error({ error }, 'Create booking error');
    res.status(500).json({ error: error.message || 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/bookings/:id
 * Get booking details
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.auth.uid;

    const booking = await db.collection('bookings').doc(bookingId).get();

    if (!booking.exists) {
      return res.status(404).json({ error: 'BOOKING_NOT_FOUND' });
    }

    const data = booking.data();

    // Check if user owns this booking or is the PRO
    if (data?.userId !== userId && data?.proId !== userId) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    res.json({ ok: true, booking: { id: booking.id, ...data } });
  } catch (error: any) {
    logger.error({ error }, 'Get booking error');
    res.status(500).json({ error: error.message || 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/bookings
 * Get user's bookings
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.uid;
    const { status } = req.query;

    let query: any = db.collection('bookings').where('userId', '==', userId);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ ok: true, bookings });
  } catch (error: any) {
    logger.error({ error }, 'Get bookings error');
    res.status(500).json({ error: error.message || 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/bookings/:id/cancel
 * Cancel a booking (with penalty logic)
 */
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.auth.uid;

    const { refundAmount, penaltyAmount } = await cancelBooking(bookingId, userId, false);

    res.json({
      ok: true,
      message: 'Booking cancelled',
      refundAmount,
      penaltyAmount,
    });
  } catch (error: any) {
    logger.error({ error }, 'Cancel booking error');
    
    if (error.message === 'BOOKING_NOT_FOUND') {
      return res.status(404).json({ error: 'BOOKING_NOT_FOUND' });
    }
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    if (error.message === 'ALREADY_CANCELLED') {
      return res.status(400).json({ error: 'ALREADY_CANCELLED' });
    }

    res.status(500).json({ error: error.message || 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/bookings/:id/confirm
 * Confirm booking after payment (called by webhook or manually)
 */
router.post('/:id/confirm', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Missing paymentIntentId' });
    }

    await confirmBooking(bookingId, paymentIntentId);

    res.json({ ok: true, message: 'Booking confirmed' });
  } catch (error: any) {
    logger.error({ error }, 'Confirm booking error');
    res.status(500).json({ error: error.message || 'INTERNAL_ERROR' });
  }
});

export default router;
