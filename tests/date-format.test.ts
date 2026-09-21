import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { nextRenewal, daysLeft, inZone } from "@/lib/renewal";

/**
 * Regresyon: tarihler API ve CSV çıktısına yazılırken toISOString() ile
 * biçimlendirilirse Europe/Istanbul (UTC+3) bir gün geriye kayar.
 * Yerel biçimlendirme (date-fns format) kullanılmalı.
 */
describe("tarih biçimlendirme UTC'ye kaymaz", () => {
  it("yerel gece yarısı aynı takvim gününde kalır", () => {
    const local = new Date(2026, 8, 16); // 16 Eylül 2026, yerel
    expect(format(local, "yyyy-MM-dd")).toBe("2026-09-16");
  });

  it("hesaplanan yenilenme tarihi API biçiminde kaymaz", () => {
    const renewal = nextRenewal("2026-09-16", "monthly", new Date(2026, 8, 15));
    expect(format(renewal, "yyyy-MM-dd")).toBe("2026-09-16");
  });

  it("ay sonu taşması sonrası da kaymaz", () => {
    const renewal = nextRenewal("2026-01-31", "monthly", new Date(2026, 1, 15));
    expect(format(renewal, "yyyy-MM-dd")).toBe("2026-02-28");
  });
});

/**
 * Regresyon: sunucu UTC'de çalıştığında (Vercel varsayılanı) takvim günü
 * İstanbul'a göre belirlenmeli. Aksi halde 00:00-03:00 arasında kalan gün
 * bir gün şaşar ve aynı güne denk gelen yenilenme bir ay ileri atlar.
 */
describe("saat dilimi: sunucu UTC olsa da İstanbul günü esas alınır", () => {
  it("İstanbul'da gün dönmüşken 'bugün' doğru sayılır", () => {
    const an = new Date("2026-09-21T22:00:00Z"); // İstanbul: 22 Eylül 01:00
    const today = inZone(an);
    expect(daysLeft(nextRenewal("2026-09-22", "monthly", today), today)).toBe(0);
  });

  it("aynı güne denk gelen yenilenme ileri atlamaz", () => {
    const today = inZone(new Date("2026-09-15T00:00:00Z"));
    expect(format(nextRenewal("2026-09-15", "monthly", today), "yyyy-MM-dd")).toBe(
      "2026-09-15",
    );
  });

  it("anchor metni sunucu dilimine göre kaymaz", () => {
    const today = inZone(new Date("2026-09-10T00:00:00Z"));
    expect(format(nextRenewal("2026-09-16", "monthly", today), "yyyy-MM-dd")).toBe(
      "2026-09-16",
    );
  });
});
