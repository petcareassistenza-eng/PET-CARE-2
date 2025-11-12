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
 *  - tz: IANA timezone e.g. "Europe/Rome" (default: Europe/Rome)
 *  - durationMin: minutes per slot (default: stepMin from meta)
 * 
 * Returns:
 *  - proId, date, tz, stepMin
 *  - windows: daily schedule windows
 *  - locks: active locks overlapping the day
 *  - slots: free slots as { start: milliseconds, end: milliseconds }
 */
router.get('/pros/:id/availability', async (req: Request, res: Response) => {
  try {
    const proId = req.params.id;
    const dateISO = String(req.query.date || '').trim();
    const tz = String(req.query.tz || 'Europe/Rome');
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    logger.info({ proId, dateISO, tz }, 'Availability request (ms-based)');

    // Load calendar meta
    const metaRef = db.collection('calendars').doc(proId).collection('meta').doc('config');
    const metaSnap = await metaRef.get();
    
    if (!metaSnap.exists) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    const meta = metaSnap.data()!;
    const stepMin: number = req.query.durationMin 
      ? parseInt(String(req.query.durationMin), 10) 
      : (meta.stepMin || 30);

    // Helper: parse HH:mm to milliseconds (local day)
    const toMillis = (hhmm: string): number => {
      const [h, m] = hhmm.split(':').map(Number);
      const d = new Date(`${dateISO}T00:00:00`);
      d.setHours(h, m, 0, 0);
      return d.getTime();
    };

    // Get daily windows from weeklySchedule or exceptions
    const dateObj = new Date(`${dateISO}T00:00:00`);
    const dow = dateObj.getDay(); // 0=Sunday, 1=Monday, ...
    
    const dailyWindows = (
      meta.exceptions?.[dateISO] ?? 
      meta.weeklySchedule?.[String(dow)] ?? 
      []
    ) as Array<{ start: string; end: string }>;

    logger.info({ dow, windowCount: dailyWindows.length }, 'Daily windows loaded');

    // Generate candidate slots within windows
    const candidateSlots: Array<{ start: number; end: number }> = [];
    
    for (const window of dailyWindows) {
      const ws = toMillis(window.start);
      const we = toMillis(window.end);
      
      for (let t = ws; t + stepMin * 60000 <= we; t += stepMin * 60000) {
        candidateSlots.push({
          start: t,
          end: t + stepMin * 60000,
        });
      }
    }

    logger.info({ candidateSlots: candidateSlots.length }, 'Candidate slots generated');

    // Load active locks (ttl > now) that overlap with this day
    const dayStart = new Date(`${dateISO}T00:00:00`).getTime();
    const dayEnd = new Date(`${dateISO}T23:59:59`).getTime();
    const nowMs = Date.now();

    const locksRef = db.collection('calendars').doc(proId).collection('locks');
    const locksSnap = await locksRef.where('ttl', '>', nowMs).get();
    
    const activeLocks = locksSnap.docs
      .map(d => d.data() as any)
      .filter(l => (l.slotStart < dayEnd) && (l.slotEnd > dayStart));

    logger.info({ activeLocks: activeLocks.length }, 'Active locks loaded');

    // Filter out slots that collide with locks
    const freeSlots = candidateSlots.filter(slot => {
      return !activeLocks.some(lock => {
        // Check if NOT overlapping (then negate)
        const noOverlap = slot.end <= lock.slotStart || slot.start >= lock.slotEnd;
        return !noOverlap; // Return true if overlapping (to filter out)
      });
    });

    logger.info({ freeSlots: freeSlots.length }, 'Free slots calculated');

    return res.json({
      proId,
      date: dateISO,
      tz,
      stepMin,
      windows: dailyWindows,
      locks: activeLocks.map(l => ({
        slotStart: l.slotStart,
        slotEnd: l.slotEnd,
      })),
      slots: freeSlots,
    });
    
  } catch (e: any) {
    logger.error({ error: e.message }, 'Availability endpoint error');
    return res.status(500).json({
      error: 'Internal error',
      details: e?.message,
    });
  }
});

export default router;
