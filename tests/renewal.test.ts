import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { nextRenewal, daysLeft, renewalStatus } from "@/lib/renewal";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

describe("nextRenewal — spec §5.1 tablosu", () => {
  it("31 Ocak aylık, 15 Şubat'ta → 28 Şubat (ay sonu taşması)", () => {
    expect(iso(nextRenewal("2026-01-31", "monthly", new Date("2026-02-15")))).toBe(
      "2026-02-28",
    );
  });

  it("31 Ocak aylık, 1 Mart'ta → 31 Mart (anchor gününe geri döner)", () => {
    expect(iso(nextRenewal("2026-01-31", "monthly", new Date("2026-03-01")))).toBe(
      "2026-03-31",
    );
  });

  it("29 Şubat 2024 yıllık, 1 Ocak 2026'da → 28 Şubat 2026", () => {
    expect(iso(nextRenewal("2024-02-29", "yearly", new Date("2026-01-01")))).toBe(
      "2026-02-28",
    );
  });

  it("gelecekteki anchor ilerletilmez", () => {
    expect(iso(nextRenewal("2026-10-05", "monthly", new Date("2026-09-15")))).toBe(
      "2026-10-05",
    );
  });

  it("tek seferlik kayıt geçmişte kalır", () => {
    expect(iso(nextRenewal("2026-03-01", "once", new Date("2026-09-15")))).toBe(
      "2026-03-01",
    );
  });
});

describe("nextRenewal — ek davranışlar", () => {
  it("bugüne denk gelen tarih ilerletilmez", () => {
    expect(iso(nextRenewal("2026-09-15", "monthly", new Date("2026-09-15")))).toBe(
      "2026-09-15",
    );
  });

  it("üç aylık döngü üçer ay atlar", () => {
    expect(iso(nextRenewal("2026-01-15", "quarterly", new Date("2026-09-15")))).toBe(
      "2026-10-15",
    );
  });

  it("31 Ocak üç aylık, Nisan 30'a düşer", () => {
    expect(iso(nextRenewal("2026-01-31", "quarterly", new Date("2026-02-01")))).toBe(
      "2026-04-30",
    );
  });

  it("yıllık döngü 31 Aralık'ta sabit kalır", () => {
    expect(iso(nextRenewal("2020-12-31", "yearly", new Date("2026-09-15")))).toBe(
      "2026-12-31",
    );
  });

  it("çok eski anchor bile bugüne veya sonrasına düşer", () => {
    const d = nextRenewal("2005-06-10", "monthly", new Date("2026-09-15"));
    expect(d.getTime()).toBeGreaterThanOrEqual(new Date("2026-09-15").getTime());
    expect(iso(d)).toBe("2026-10-10");
  });
});

describe("daysLeft ve renewalStatus — spec §5.4", () => {
  const today = new Date("2026-09-15");

  it("kalan gün doğru sayılır", () => {
    expect(daysLeft(new Date("2026-09-18"), today)).toBe(3);
    expect(daysLeft(new Date("2026-09-15"), today)).toBe(0);
    expect(daysLeft(new Date("2026-09-10"), today)).toBe(-5);
  });

  it("sınıflar spec aralıklarına uyar", () => {
    expect(renewalStatus(-1)).toBe("overdue");
    expect(renewalStatus(0)).toBe("critical");
    expect(renewalStatus(3)).toBe("critical");
    expect(renewalStatus(4)).toBe("soon");
    expect(renewalStatus(10)).toBe("soon");
    expect(renewalStatus(11)).toBe("normal");
  });
});
