import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { nextRenewal } from "@/lib/renewal";

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
