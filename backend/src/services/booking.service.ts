import * as admin from 'firebase-admin';

import { logger } from '../logger.js';

const db = admin.firestore();

export interface HoldSlotParams {
  proId: string;
  dateISO: string; // YYYY-MM-DD
  start: string;   // HH:MM
  end: string;     // HH:MM
  userId: string;
}

export interface BookingData {
  proId: string;
  userId: string;
  serviceId?: string;
  serviceName: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  price: number;
  appFee: number;
  discount?: number;
  totalPaid: number;
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'completed';
  paymentIntentId?: string;
  couponCode?: string;
  petIds?: string[];
  notes?: string;
  createdAt: admin.firestore.FieldValue;
}

/**
 * Hold a slot with transaction lock to prevent double booking
 * Returns true if slot was successfully locked, false if already taken
 */
export async function holdSlot(params: HoldSlotParams): Promise<boolean> {
  const { proId, dateISO, start, end, userId } = params;
  const lockId = `${dateISO}_${start}`;
  const slotDoc = db.doc(`calendars/${proId}/locks/${lockId}`);
  
  try {
    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(slotDoc);
      
      // Check if slot is already held
      if (snap.exists) {
        const data = snap.data();
        const ttl = data?.ttl;
        
        // If TTL expired, allow new booking
        if (ttl && ttl.toMillis() < Date.now()) {
          logger.info({ lockId, proId }, 'Expired lock found, overwriting');
        } else {
          logger.warn({ lockId, proId, existingUserId: data?.userId }, 'Slot already held');
          return false;
        }
      }
      
      // Lock the slot for 5 minutes
      // Parse ISO datetime strings to Timestamps
      const slotStartDate = new Date(`${dateISO}T${start}:00Z`);
      const slotEndDate = new Date(`${dateISO}T${end}:00Z`);
      
      const lockData = {
        userId,
        proId,
        slotStart: admin.firestore.Timestamp.fromDate(slotStartDate), // Match schema
        slotEnd: admin.firestore.Timestamp.fromDate(slotEndDate),     // Match schema
        dateISO,
        createdAt: admin.firestore.Timestamp.now(),
        ttl: admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000), // 5 minutes
      };
      
      transaction.set(slotDoc, lockData);
      
      logger.info({ lockId, proId, userId }, 'Slot locked successfully');
      return true;
    });
    
    return result;
  } catch (error) {
    logError(error as Error, { proId, dateISO, start });
    throw error;
  }
}

/**
 * Release a held slot (e.g., if user cancels before payment)
 */
export async function releaseSlot(proId: string, dateISO: string, start: string): Promise<void> {
  const lockId = `${dateISO}_${start}`;
  const slotDoc = db.doc(`calendars/${proId}/locks/${lockId}`);
  
  try {
    await slotDoc.delete();
    logger.info({ lockId, proId }, 'Slot lock released');
  } catch (error) {
    logError(error as Error, { proId, dateISO, start });
  }
}

/**
 * Create a booking with pending_payment status
 * Idempotent using bookingId
 */
export async function createBooking(bookingId: string, data: BookingData): Promise<string> {
  const bookingRef = db.collection('bookings').doc(bookingId);
  
  try {
    // Check if booking already exists (idempotency)
    const existing = await bookingRef.get();
    if (existing.exists) {
      logger.info({ bookingId }, 'Booking already exists (idempotent)');
      return bookingId;
    }
    
    await bookingRef.set({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    logger.info({ bookingId, proId: data.proId, userId: data.userId }, 'Booking created');
    return bookingId;
  } catch (error) {
    logError(error as Error, { bookingId });
    throw error;
  }
}

/**
 * Confirm booking after successful payment
 */
export async function confirmBooking(bookingId: string, paymentIntentId: string): Promise<void> {
  const bookingRef = db.collection('bookings').doc(bookingId);
  
  try {
    await bookingRef.update({
      status: 'confirmed',
      paymentIntentId,
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    logger.info({ bookingId, paymentIntentId }, 'Booking confirmed');
  } catch (error) {
    logError(error as Error, { bookingId, paymentIntentId });
    throw error;
  }
}

/**
 * Cancel booking with penalty calculation
 */
export async function cancelBooking(
  bookingId: string,
  userId: string,
  isProCancelling: boolean = false
): Promise<{ refundAmount: number; penaltyAmount: number }> {
  const bookingRef = db.collection('bookings').doc(bookingId);
  
  try {
    const booking = await bookingRef.get();
    if (!booking.exists) {
      throw new Error('BOOKING_NOT_FOUND');
    }
    
    const data = booking.data() as any;
    
    // Verify ownership
    if (!isProCancelling && data.userId !== userId) {
      throw new Error('FORBIDDEN');
    }
    
    if (data.status === 'cancelled') {
      throw new Error('ALREADY_CANCELLED');
    }
    
    // Calculate time until booking
    const bookingDateTime = new Date(`${data.date}T${data.timeStart}`);
    const hoursUntil = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    // Penalty logic: <24h = 50% penalty, >=24h = full refund
    const totalPaid = data.totalPaid || 0;
    let refundAmount = totalPaid;
    let penaltyAmount = 0;
    
    if (hoursUntil < 24 && !isProCancelling) {
      penaltyAmount = Math.round(totalPaid * 0.5);
      refundAmount = totalPaid - penaltyAmount;
    }
    
    await bookingRef.update({
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: isProCancelling ? 'pro' : 'user',
      refundAmount,
      penaltyAmount,
    });
    
    logger.info({ bookingId, refundAmount, penaltyAmount, hoursUntil }, 'Booking cancelled');
    
    return { refundAmount, penaltyAmount };
  } catch (error) {
    logError(error as Error, { bookingId, userId });
    throw error;
  }
}

/**
 * Clean expired locks (to be run periodically)
 */
export async function cleanExpiredLocks(): Promise<number> {
  try {
    const now = Date.now();
    let count = 0;
    
    // Get all calendars
    const calendars = await db.collection('calendars').listDocuments();
    
    for (const calendarRef of calendars) {
      const locks = await calendarRef.collection('locks').where('ttl', '<', now).get();
      
      const batch = db.batch();
      locks.docs.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });
      
      if (locks.size > 0) {
        await batch.commit();
      }
    }
    
    logger.info({ count }, 'Expired locks cleaned');
    return count;
  } catch (error) {
    logError(error as Error, {});
    return 0;
  }
}

function logError(error: Error, context: Record<string, any>) {
  logger.error(
    {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    },
    'Booking service error'
  );
}
