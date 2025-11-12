import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { DateTime, Interval } from 'luxon';

import { logger } from '../logger.js';

const db = admin.firestore();
const router = Router();

type IntervalStr = { start: string; end: string }; // "HH:mm"
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// Luxon weekday: Monday=1, Tuesday=2, ..., Sunday=7
// Array mapping: [sun, mon, tue, wed, thu, fri, sat]
const dayMap: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function toDayKey(dt: DateTime): DayKey {
  // Luxon: 1=Mon, 7=Sun
  // We need: 0=Sun, 1=Mon, ..., 6=Sat
  const dayIndex = dt.weekday === 7 ? 0 : dt.weekday;
  return dayMap[dayIndex];
}

function* generateSteps(start: DateTime, end: DateTime, stepMin: number) {
  let cursor = start;
  while (cursor.plus({ minutes: stepMin }) <= end) {
    const next = cursor.plus({ minutes: stepMin });
    yield Interval.fromDateTimes(cursor, next);
    cursor = next;
  }
}

function parseIntervals(base: IntervalStr[], day: DateTime, tz: string): Interval[] {
  return (base ?? []).map(({ start, end }) => {
    const s = DateTime.fromISO(`${day.toISODate()}T${start}`, { zone: tz }).toUTC();
    const e = DateTime.fromISO(`${day.toISODate()}T${end}`, { zone: tz }).toUTC();
    return Interval.fromDateTimes(s, e);
  });
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.overlaps(b);
}

/**
 * GET /api/pros/:id/availability
 * Query params:
 *   - from: YYYY-MM-DD (default: today)
 *   - to: YYYY-MM-DD (default: today + 7 days)
 * 
 * Returns available time slots for the PRO, considering:
 *   1. Weekly schedule from calendar
 *   2. Exception dates (closed or custom intervals)
 *   3. Existing bookings (pending/confirmed)
 *   4. Active locks (not expired)
 */
router.get('/pros/:id/availability', async (req: Request, res: Response) => {
  try {
    const proId = req.params.id;
    const from = (req.query.from as string) || DateTime.now().toISODate();
    const to = (req.query.to as string) || DateTime.now().plus({ days: 7 }).toISODate();

    if (!from || !to) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const fromDt = DateTime.fromISO(from, { zone: 'utc' }).startOf('day');
    const toDt = DateTime.fromISO(to, { zone: 'utc' }).endOf('day');

    // Limit range to 14 days max
    if (toDt.diff(fromDt, 'days').days > 14) {
      return res.status(400).json({ error: 'Range too large (max 14 days)' });
    }

    logger.info({ proId, from, to }, 'Availability request');

    // 1. Load calendar configuration
    const calRef = db.collection('calendars').doc(proId);
    const calSnap = await calRef.get();
    
    if (!calSnap.exists) {
      return res.status(404).json({ error: 'CALENDAR_NOT_FOUND' });
    }

    const cal = calSnap.data()!;
    const stepMin: number = cal.stepMin || 30;
    const weekly = cal.weeklySchedule || {};
    const tz: string = cal.timezone || 'Europe/Rome';

    // 2. Generate date range
    const days: DateTime[] = [];
    for (let d = fromDt; d <= toDt; d = d.plus({ days: 1 })) {
      days.push(d);
    }

    // 3. Load exceptions for the date range
    const exceptionsSnaps = await Promise.all(
      days.map((d) => calRef.collection('exceptions').doc(d.toISODate()!).get())
    );
    
    const exceptionsMap = new Map<string, any>();
    exceptionsSnaps.forEach((s) => {
      if (s.exists) {
        exceptionsMap.set(s.id, s.data());
      }
    });

    // 4. Load active bookings (pending or confirmed, not cancelled)
    const bookingsSnap = await db
      .collection('bookings')
      .where('proId', '==', proId)
      .where('start', '<=', admin.firestore.Timestamp.fromDate(toDt.toJSDate()))
      .where('end', '>=', admin.firestore.Timestamp.fromDate(fromDt.toJSDate()))
      .get();

    const activeBookings = bookingsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((b: any) => b.status !== 'cancelled')
      .map((b: any) =>
        Interval.fromDateTimes(
          DateTime.fromJSDate(b.start.toDate()).toUTC(),
          DateTime.fromJSDate(b.end.toDate()).toUTC()
        )
      );

    logger.info({ activeBookings: activeBookings.length }, 'Active bookings loaded');

    // 5. Load active locks (not expired)
    const now = admin.firestore.Timestamp.now();
    const locksSnap = await db
      .collectionGroup('locks')
      .where('ttl', '>', now)
      .where('slotStart', '<=', admin.firestore.Timestamp.fromDate(toDt.toJSDate()))
      .get();

    const activeLocks = locksSnap.docs
      .filter((d) => d.ref.path.startsWith(`calendars/${proId}/`))
      .map((d) => d.data() as any)
      .map((l) =>
        Interval.fromDateTimes(
          DateTime.fromJSDate(l.slotStart.toDate()).toUTC(),
          DateTime.fromJSDate(l.slotEnd.toDate()).toUTC()
        )
      );

    logger.info({ activeLocks: activeLocks.length }, 'Active locks loaded');

    // 6. Build availability for each day
    const result: any[] = [];

    for (const dayUTC of days) {
      const dayLocal = dayUTC.setZone(tz);
      const key = dayLocal.toISODate()!;

      // Determine intervals for this day
      let intervals: Interval[] = [];
      const ex = exceptionsMap.get(key);

      if (ex?.closed) {
        // PRO is closed this day
        intervals = [];
      } else if (ex?.intervals?.length) {
        // Exception with custom intervals
        intervals = parseIntervals(ex.intervals, dayLocal, tz);
      } else {
        // Use weekly schedule
        const wkKey = toDayKey(dayLocal);
        const weeklyIntervals = weekly[wkKey] || [];
        intervals = parseIntervals(weeklyIntervals, dayLocal, tz);
      }

      // Generate slots from intervals
      const allSlots: { start: string; end: string }[] = [];
      for (const iv of intervals) {
        for (const step of generateSteps(iv.start, iv.end, stepMin)) {
          allSlots.push({
            start: step.start.toISO()!, // UTC ISO string
            end: step.end.toISO()!,
          });
        }
      }

      // Filter out slots that overlap with bookings or locks
      const available = allSlots.filter((s) => {
        const iv = Interval.fromDateTimes(
          DateTime.fromISO(s.start),
          DateTime.fromISO(s.end)
        );

        // Check booking conflicts
        const clashBooking = activeBookings.some((b) => overlaps(iv, b));
        if (clashBooking) return false;

        // Check lock conflicts
        const clashLock = activeLocks.some((l) => overlaps(iv, l));
        if (clashLock) return false;

        return true;
      });

      result.push({
        date: key, // Local date in PRO's timezone
        stepMin,
        slots: available, // Array of { start: ISO UTC, end: ISO UTC }
      });
    }

    res.json({
      ok: true,
      proId,
      from,
      to,
      timezone: tz,
      days: result,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Availability endpoint error');
    res.status(500).json({ error: 'INTERNAL_ERROR', detail: err?.message });
  }
});

export default router;
