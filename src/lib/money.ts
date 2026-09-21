import type { Cycle } from "./renewal";

export type Currency = "TRY" | "USD" | "EUR";
export const CURRENCIES: Currency[] = ["TRY", "USD", "EUR"];

export type FxRateRow = { currency: string; date: string; rateTry: number };

/** spec §5.2 — dönem tutarının aylık eşdeğeri. */
export function monthlyEquivalent(amount: number, cycle: Cycle): number {
  switch (cycle) {
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    case "once":
      return 0; // tekrar eden gidere dahil edilmez
  }
}

export type MonthlyInput = {
  amount: number;
  cycle: Cycle;
  currency: Currency;
  status: "active" | "paused" | "cancelled";
};

/** Para birimi bazında aylık toplam. Yalnızca aktif kayıtlar sayılır. */
export function totalsByCurrency(
  items: MonthlyInput[],
): Record<Currency, number> {
  const totals: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };
  for (const item of items) {
    if (item.status !== "active") continue;
    totals[item.currency] += monthlyEquivalent(item.amount, item.cycle);
  }
  return totals;
}

/**
 * spec §5.3 — her para birimi için en güncel tarihli kuru seçer.
 * TRY her zaman 1'dir ve tabloda aranmaz.
 */
export function latestRates(rows: FxRateRow[]): Partial<Record<Currency, number>> {
  const newest = new Map<string, FxRateRow>();
  for (const row of rows) {
    const current = newest.get(row.currency);
    if (!current || row.date > current.date) newest.set(row.currency, row);
  }
  const out: Partial<Record<Currency, number>> = { TRY: 1 };
  for (const currency of CURRENCIES) {
    if (currency === "TRY") continue;
    const row = newest.get(currency);
    if (row) out[currency] = row.rateTry;
  }
  return out;
}

export type TryConversion = {
  /** Kuru bilinen para birimlerinin TL toplamı. */
  total: number;
  /** Kuru girilmemiş, bu yüzden toplama katılamayan para birimleri. */
  missing: Currency[];
  /** Toplam eksiksiz mi — eksikse arayüzde uyarı gösterilir. */
  complete: boolean;
};

/**
 * spec §5.3 — kur yoksa uydurma varsayılan kullanılmaz; ilgili para birimi
 * toplama katılmaz ve `missing` içinde raporlanır.
 */
export function toTry(
  totals: Record<Currency, number>,
  rates: Partial<Record<Currency, number>>,
): TryConversion {
  let total = 0;
  const missing: Currency[] = [];

  for (const currency of CURRENCIES) {
    const amount = totals[currency];
    if (!amount) continue;
    const rate = currency === "TRY" ? 1 : rates[currency];
    if (rate == null) {
      missing.push(currency);
      continue;
    }
    total += amount * rate;
  }

  return { total, missing, complete: missing.length === 0 };
}

const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  TRY: new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }),
  USD: new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD" }),
  EUR: new Intl.NumberFormat("tr-TR", { style: "currency", currency: "EUR" }),
};

export function formatMoney(amount: number, currency: Currency): string {
  return FORMATTERS[currency].format(amount);
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
