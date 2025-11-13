/**
 * Slot Calculation Utility
 * 
 * Gestisce il calcolo degli slot disponibili per prenotazioni PRO
 * con supporto per:
 * - Generazione slot da regole orarie
 * - Controllo overlap tra prenotazioni/lock
 * - Gestione timezone (UTC)
 */

import { DateTime } from 'luxon';

/**
 * Slot temporale con formato HH:mm
 */
export type Slot = {
  start: string; // "HH:mm" format (es: "09:00")
  end: string;   // "HH:mm" format (es: "13:00")
};

/**
 * Piano giornaliero = array di slot
 * Esempio: [{start: "09:00", end: "13:00"}, {start: "15:00", end: "19:00"}]
 */
export type DayPlan = Slot[];

/**
 * Genera array di timestamp ISO per tutti gli slot disponibili in un giorno
 * 
 * @param dayISO - Data in formato ISO (es: "2025-11-20")
 * @param rules - Piano giornaliero con slot disponibili
 * @param stepMin - Durata slot in minuti (es: 30)
 * @returns Array di ISO timestamps (es: ["2025-11-20T09:00:00.000Z", ...])
 * 
 * @example
 * genDaySlots("2025-11-20", [{start: "09:00", end: "11:00"}], 30)
 * // Returns: ["2025-11-20T09:00:00.000Z", "2025-11-20T09:30:00.000Z", "2025-11-20T10:00:00.000Z", "2025-11-20T10:30:00.000Z"]
 */
export function genDaySlots(
  dayISO: string,
  rules: DayPlan,
  stepMin: number,
): string[] {
  // Parsing data inizio giorno
  const day = DateTime.fromISO(dayISO, { zone: 'utc' }).startOf('day');
  const out: string[] = [];

  // Itera su ogni slot rule del giorno
  for (const rule of rules) {
    // Parse start time (HH:mm)
    const [startHour, startMinute] = rule.start.split(':').map(Number);
    let cur = day.set({ hour: startHour, minute: startMinute });

    // Parse end time (HH:mm)
    const [endHour, endMinute] = rule.end.split(':').map(Number);
    const end = day.set({ hour: endHour, minute: endMinute });

    // Genera slot con step specificato
    while (cur.plus({ minutes: stepMin }) <= end) {
      out.push(cur.toUTC().toISO()!);
      cur = cur.plus({ minutes: stepMin });
    }
  }

  return out;
}

/**
 * Verifica overlap tra due intervalli temporali
 * 
 * Logica: Due intervalli si sovrappongono se:
 * - L'inizio del primo è prima della fine del secondo, E
 * - L'inizio del secondo è prima della fine del primo
 * 
 * @param aStart - ISO timestamp inizio primo intervallo
 * @param aEnd - ISO timestamp fine primo intervallo
 * @param bStart - ISO timestamp inizio secondo intervallo
 * @param bEnd - ISO timestamp fine secondo intervallo
 * @returns true se gli intervalli si sovrappongono
 * 
 * @example
 * overlap("2025-11-20T09:00:00Z", "2025-11-20T09:30:00Z", 
 *         "2025-11-20T09:15:00Z", "2025-11-20T09:45:00Z")
 * // Returns: true (sovrapp per 15 minuti)
 * 
 * overlap("2025-11-20T09:00:00Z", "2025-11-20T09:30:00Z",
 *         "2025-11-20T10:00:00Z", "2025-11-20T10:30:00Z")
 * // Returns: false (no overlap)
 */
export function overlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const aS = DateTime.fromISO(aStart, { zone: 'utc' });
  const aE = DateTime.fromISO(aEnd, { zone: 'utc' });
  const bS = DateTime.fromISO(bStart, { zone: 'utc' });
  const bE = DateTime.fromISO(bEnd, { zone: 'utc' });

  // Overlap condition: aStart < bEnd AND bStart < aEnd
  return aS < bE && bS < aE;
}

/**
 * Converte HH:mm in minuti dall'inizio del giorno
 * Utile per confronti numerici
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converte minuti in formato HH:mm
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Calcola la durata in minuti tra due timestamp ISO
 */
export function durationMinutes(startISO: string, endISO: string): number {
  const start = DateTime.fromISO(startISO);
  const end = DateTime.fromISO(endISO);
  return end.diff(start, 'minutes').minutes;
}

/**
 * Verifica se uno slot è nel passato
 */
export function isPast(slotISO: string): boolean {
  const slot = DateTime.fromISO(slotISO);
  const now = DateTime.utc();
  return slot < now;
}
