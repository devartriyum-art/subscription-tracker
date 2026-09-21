import { TZDate } from "@date-fns/tz";
import {
  addMonths,
  differenceInCalendarDays,
  isBefore,
  lastDayOfMonth,
  setDate,
  startOfDay,
} from "date-fns";

export const STEP = { monthly: 1, quarterly: 3, yearly: 12, once: 0 } as const;

/**
 * Tüm tarih hesapları bu dilimde yapılır. Sunucu UTC'de çalışsa bile
 * "bugün" İstanbul'a göre belirlenir — aksi halde 00:00-03:00 arasında
 * kalan gün sayısı bir gün şaşar.
 */
export const TIME_ZONE = "Europe/Istanbul";

/** Verilen anı İstanbul saatine çevirir. */
export function inZone(date: Date = new Date()): Date {
  return new TZDate(date, TIME_ZONE);
}

export type Cycle = keyof typeof STEP;
export type RenewalStatus = "overdue" | "critical" | "soon" | "normal";

/** anchor'dan başlayıp bugüne veya sonrasına düşen ilk tarihi döndürür. */
export function nextRenewal(
  anchorISO: string,
  cycle: Cycle,
  today: Date = inZone(),
): Date {
  const anchor = startOfDay(parseISODate(anchorISO));
  const step = STEP[cycle];
  if (step === 0) return anchor; // tek seferlik: hiç ilerlemez

  // Karşılaştırma İstanbul takvim gününe göre yapılır; sunucu UTC'de olsa da
  // aynı güne denk gelen yenilenme ileri atlamaz.
  const todayStart = startOfDay(new TZDate(today, TIME_ZONE));

  const anchorDay = anchor.getDate();
  let d = anchor;
  let guard = 0;
  while (isBefore(d, todayStart) && guard++ < 1200) {
    d = addMonths(d, step);
    // 31 Ocak + 1 ay = 28/29 Şubat olmalı, sonraki ayda tekrar 31'e dönmeli
    const maxDay = lastDayOfMonth(d).getDate();
    d = setDate(d, Math.min(anchorDay, maxDay));
  }
  return d;
}

/**
 * "YYYY-MM-DD" metnini İstanbul saatinde Date'e çevirir.
 * Sunucu UTC'de çalışsa bile takvim günü kaymaz.
 */
export function parseISODate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return startOfDay(new TZDate(new Date(value), TIME_ZONE));
  const [, y, m, d] = match;
  return new TZDate(Number(y), Number(m) - 1, Number(d), TIME_ZONE);
}

/** Yenilenmeye kalan tam gün sayısı. Geçmiş için negatif döner. */
export function daysLeft(renewal: Date, today: Date = inZone()): number {
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
