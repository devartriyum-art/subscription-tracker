import { describe, expect, it } from "vitest";
import {
  monthlyEquivalent,
  totalsByCurrency,
  latestRates,
  toTry,
  type MonthlyInput,
} from "@/lib/money";

describe("monthlyEquivalent — spec §5.2", () => {
  it("aylık tutar aynen geçer", () => {
    expect(monthlyEquivalent(100, "monthly")).toBe(100);
  });

  it("üç aylık üçe bölünür", () => {
    expect(monthlyEquivalent(300, "quarterly")).toBe(100);
  });

  it("yıllık abonelik aylık toplama 1/12 yansır", () => {
    expect(monthlyEquivalent(1200, "yearly")).toBe(100);
  });

  it("tek seferlik tekrar eden gidere girmez", () => {
    expect(monthlyEquivalent(5000, "once")).toBe(0);
  });
});

describe("totalsByCurrency", () => {
  const items: MonthlyInput[] = [
    { amount: 100, cycle: "monthly", currency: "USD", status: "active" },
    { amount: 1200, cycle: "yearly", currency: "USD", status: "active" },
    { amount: 500, cycle: "monthly", currency: "TRY", status: "active" },
    { amount: 999, cycle: "monthly", currency: "TRY", status: "paused" },
    { amount: 999, cycle: "monthly", currency: "EUR", status: "cancelled" },
  ];

  it("para birimi bazında ayrı toplar", () => {
    expect(totalsByCurrency(items)).toEqual({ TRY: 500, USD: 200, EUR: 0 });
  });

  it("yalnızca aktif kayıtları sayar", () => {
    const totals = totalsByCurrency(items);
    expect(totals.TRY).toBe(500); // paused olan 999 dahil değil
    expect(totals.EUR).toBe(0); // cancelled olan dahil değil
  });
});

describe("latestRates — spec §5.3", () => {
  it("en güncel tarihli kaydı seçer", () => {
    const rates = latestRates([
      { currency: "USD", date: "2026-09-01", rateTry: 40 },
      { currency: "USD", date: "2026-09-14", rateTry: 42 },
      { currency: "EUR", date: "2026-09-10", rateTry: 45 },
    ]);
    expect(rates.USD).toBe(42);
    expect(rates.EUR).toBe(45);
    expect(rates.TRY).toBe(1);
  });

  it("kaydı olmayan para birimi tanımsız kalır", () => {
    expect(latestRates([]).USD).toBeUndefined();
  });
});

describe("toTry — kur yoksa uydurma kur kullanılmaz", () => {
  it("kurlar tamsa tek TL rakamı üretir", () => {
    const result = toTry({ TRY: 500, USD: 100, EUR: 0 }, { TRY: 1, USD: 42 });
    expect(result.total).toBe(500 + 4200);
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("kuru olmayan para birimi toplamdan dışlanır ve raporlanır", () => {
    const result = toTry({ TRY: 500, USD: 100, EUR: 50 }, { TRY: 1, USD: 42 });
    expect(result.total).toBe(500 + 4200); // EUR hiç eklenmedi
    expect(result.missing).toEqual(["EUR"]);
    expect(result.complete).toBe(false);
  });

  it("tutarı sıfır olan para birimi eksik sayılmaz", () => {
    const result = toTry({ TRY: 500, USD: 0, EUR: 0 }, { TRY: 1 });
    expect(result.complete).toBe(true);
    expect(result.total).toBe(500);
  });
});
