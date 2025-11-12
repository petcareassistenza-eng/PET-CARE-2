import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';

import { logger } from '../logger.js';

const db = admin.firestore();
const router = Router();

/**
 * GET /api/pros/:id/availability
 * 
 * Query params:
 *  - date: ISO "YYYY-MM-DD" (required)
 * 
 * Returns slots as ISO UTC strings:
 *  { date, stepMin, slots: [{ from: "ISO", to: "ISO" }] }
 */
router.get('/pros/:id/availability', async (req: Request, res: Response) => {
  try {
    const proId = req.params.id;
    const dateISO = String(req.query.date || '').trim();
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    logger.info({ proId, dateISO }, 'Availability request (ISO format)');

    // Load calendar meta
    const metaRef = db.collection('calendars').doc(proId).collection('meta').doc('config');
    const metaSnap = await metaRef.get();
    
    if (!metaSnap.exists) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    const meta = metaSnap.data()!;
    const stepMin: number = meta.stepMin || 30;
    const timezone: string = meta.timezone || 'Europe/Rome';

    // Get day of week (0=Sunday, 1=Monday, ...)
    const dateObj = new Date(`${dateISO}T00:00:00Z`);
    const dow = dateObj.getUTCDay();
    
    // Day name mapping for string keys (sun, mon, tue, wed, thu, fri, sat)
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = dayNames[dow];
    
    // Get daily windows from exceptions or weeklySchedule
    let dailyWindows: Array<{ start: string; end: string }> = [];
    
    // 1. Check exceptions (support both object and array format)
    if (meta.exceptions) {
      if (Array.isArray(meta.exceptions)) {
        // Array format: [{ date: "YYYY-MM-DD", slots: [...] }]
        const exception = meta.exceptions.find((e: any) => e.date === dateISO);
        if (exception) {
          dailyWindows = exception.slots || [];
        }
      } else {
        // Object format: { "YYYY-MM-DD": [...] }
        dailyWindows = meta.exceptions[dateISO] || dailyWindows;
      }
    }
    
    // 2. If no exception, use weeklySchedule (support both string and number keys)
    if (dailyWindows.length === 0 && meta.weeklySchedule) {
      // Try string key first (sun, mon, tue, wed, thu, fri, sat)
      dailyWindows = meta.weeklySchedule[dayName] || 
                     // Fallback to number key ("0", "1", "2", ...)
                     meta.weeklySchedule[String(dow)] || 
                     [];
    }

    logger.info({ dow, dayName, windowCount: dailyWindows.length }, 'Daily windows loaded');

    // Helper: parse HH:mm to ISO string for the given date
    const toISO = (hhmm: string): string => {
      const [h, m] = hhmm.split(':').map(Number);
      const d = new Date(Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate(),
        h,
        m
      ));
      return d.toISOString();
    };

    // Generate candidate slots within windows
    const candidateSlots: Array<{ from: string; to: string }> = [];
    
    for (const window of dailyWindows) {
      const wsISO = toISO(window.start);
      const weISO = toISO(window.end);
      const wsMs = new Date(wsISO).getTime();
      const weMs = new Date(weISO).getTime();
      
      for (let t = wsMs; t + stepMin * 60000 <= weMs; t += stepMin * 60000) {
        const from = new Date(t).toISOString();
        const to = new Date(t + stepMin * 60000).toISOString();
        candidateSlots.push({ from, to });
      }
    }

    logger.info({ candidateSlots: candidateSlots.length }, 'Candidate slots generated');

    // Apply maxAdvanceDays filter (limit how far ahead bookings can be made)
    const maxAdvanceDays = meta.maxAdvanceDays ?? 60; // Default 60 days
    const nowMs = Date.now();
    const maxBookingDateMs = nowMs + (maxAdvanceDays * 86400000); // Convert days to ms

    const filteredSlots = candidateSlots.filter(slot => {
      const slotFromMs = new Date(slot.from).getTime();
      return slotFromMs <= maxBookingDateMs;
    });

    logger.info({ 
      candidateSlots: candidateSlots.length,
      filteredSlots: filteredSlots.length,
      maxAdvanceDays,
    }, 'Slots filtered by maxAdvanceDays');

    // Use filtered slots for further processing
    const slotsToProcess = filteredSlots;

    // Load active bookings (status !== cancelled)
    const dayStart = new Date(`${dateISO}T00:00:00Z`);
    const dayEnd = new Date(`${dateISO}T23:59:59Z`);

    const bookingsSnap = await db
      .collection('bookings')
      .where('proId', '==', proId)
      .where('from', '>=', admin.firestore.Timestamp.fromDate(dayStart))
      .where('from', '<=', admin.firestore.Timestamp.fromDate(dayEnd))
      .get();

    const activeBookings = bookingsSnap.docs
      .map(d => d.data() as any)
      .filter(b => b.status !== 'cancelled')
      .map(b => ({
        from: b.from.toDate().toISOString(),  // from is Timestamp
        to: b.to.toDate().toISOString(),      // to is Timestamp
      }));

    logger.info({ activeBookings: activeBookings.length }, 'Active bookings loaded');

    // Load active locks (ttl > now) - using Timestamp comparison
    const nowTimestamp = admin.firestore.Timestamp.now();
    const locksRef = db.collection('calendars').doc(proId).collection('locks');
    const locksSnap = await locksRef.where('ttl', '>', nowTimestamp).get();
    
    const activeLocks = locksSnap.docs
      .map(d => d.data() as any)
      .map(l => {
        // Support both field names: from/to (new schema) and slotStart/slotEnd (old schema)
        const fromField = l.from || l.slotStart;
        const toField = l.to || l.slotEnd;
        
        // Handle both Timestamp (new) and milliseconds number (old)
        let fromDate: Date;
        let toDate: Date;
        
        if (fromField?.toDate) {
          // Timestamp object
          fromDate = fromField.toDate();
        } else if (typeof fromField === 'number') {
          // Milliseconds
          fromDate = new Date(fromField);
        } else {
          // Fallback
          fromDate = new Date(fromField);
        }
        
        if (toField?.toDate) {
          toDate = toField.toDate();
        } else if (typeof toField === 'number') {
          toDate = new Date(toField);
        } else {
          toDate = new Date(toField);
        }
        
        return {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        };
      });

    logger.info({ activeLocks: activeLocks.length }, 'Active locks loaded');

    // Combine bookings and locks as occupied intervals
    const occupied = [...activeBookings, ...activeLocks];

    // Filter out slots that overlap with occupied intervals
    const freeSlots = slotsToProcess.filter(slot => {
      const slotFromMs = new Date(slot.from).getTime();
      const slotToMs = new Date(slot.to).getTime();

      return !occupied.some(occ => {
        const occFromMs = new Date(occ.from).getTime();
        const occToMs = new Date(occ.to).getTime();
        
        // Check overlap: NOT (slot.to <= occ.from OR slot.from >= occ.to)
        const noOverlap = slotToMs <= occFromMs || slotFromMs >= occToMs;
        return !noOverlap;
      });
    });

    logger.info({ freeSlots: freeSlots.length }, 'Free slots calculated');

    return res.json({
      date: dateISO,
      stepMin,
      timezone,
      slots: freeSlots,
    });
    
  } catch (e: any) {
    logger.error({ error: e.message, stack: e.stack }, 'Availability endpoint error');
    return res.status(500).json({
      error: 'Internal error',
      details: e?.message,
    });
  }
});

export default router;
