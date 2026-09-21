import {
  addMonths,
  differenceInCalendarDays,
  isBefore,
  lastDayOfMonth,
  setDate,
  startOfDay,
} from "date-fns";

export const STEP = { monthly: 1, quarterly: 3, yearly: 12, once: 0 } as const;

export type Cycle = keyof typeof STEP;
export type RenewalStatus = "overdue" | "critical" | "soon" | "normal";

/** anchor'dan başlayıp bugüne veya sonrasına düşen ilk tarihi döndürür. */
export function nextRenewal(
  anchorISO: string,
  cycle: Cycle,
  today: Date = new Date(),
): Date {
  const anchor = startOfDay(parseISODate(anchorISO));
  const step = STEP[cycle];
  if (step === 0) return anchor; // tek seferlik: hiç ilerlemez

  const anchorDay = anchor.getDate();
  let d = anchor;
  let guard = 0;
  while (isBefore(d, startOfDay(today)) && guard++ < 1200) {
    d = addMonths(d, step);
    // 31 Ocak + 1 ay = 28/29 Şubat olmalı, sonraki ayda tekrar 31'e dönmeli
    const maxDay = lastDayOfMonth(d).getDate();
    d = setDate(d, Math.min(anchorDay, maxDay));
  }
  return d;
}

/** "YYYY-MM-DD" metnini yerel saatte (UTC kaymasız) Date'e çevirir. */
export function parseISODate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return startOfDay(new Date(value));
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/** Yenilenmeye kalan tam gün sayısı. Geçmiş için negatif döner. */
export function daysLeft(renewal: Date, today: Date = new Date()): number {
  return differenceInCalendarDays(startOfDay(renewal), startOfDay(today));
}

/** spec §5.4 — kalan güne göre durum sınıfı. */
export function renewalStatus(days: number): RenewalStatus {
  if (days < 0) return "overdue";
  if (days <= 3) return "critical";
  if (days <= 10) return "soon";
  return "normal";
}

export const CYCLE_LABELS: Record<Cycle, string> = {
  monthly: "Aylık",
  quarterly: "3 Aylık",
  yearly: "Yıllık",
  once: "Tek seferlik",
};

export const STATUS_LABELS: Record<RenewalStatus, string> = {
  overdue: "Geçmiş",
  critical: "Kritik",
  soon: "Yaklaşıyor",
  normal: "Normal",
};
