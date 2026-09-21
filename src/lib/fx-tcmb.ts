import "server-only";

/**
 * spec §5.3 — TCMB günlük kur servisi. Anahtar gerektirmez, ForexSelling okunur.
 * Hafta sonu/tatilde servis bir önceki iş gününü verir; bu hata değildir.
 */
const TCMB_URL = "https://www.tcmb.gov.tr/kurlar/today.xml";

export type TcmbRate = { currency: "USD" | "EUR"; rateTry: number };

export async function fetchTcmbRates(): Promise<TcmbRate[]> {
  const response = await fetch(TCMB_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`TCMB servisi yanıt vermedi (${response.status})`);
  }

  const xml = await response.text();
  const out: TcmbRate[] = [];

  for (const currency of ["USD", "EUR"] as const) {
    const rate = readForexSelling(xml, currency);
    if (rate != null) out.push({ currency, rateTry: rate });
  }

  if (out.length === 0) {
    throw new Error("TCMB yanıtından kur okunamadı");
  }

  return out;
}

function readForexSelling(xml: string, code: string): number | null {
  const block = new RegExp(
    `<Currency[^>]*CurrencyCode="${code}"[^>]*>([\\s\\S]*?)</Currency>`,
  ).exec(xml);
  if (!block) return null;

  const value = /<ForexSelling>([\d.]+)<\/ForexSelling>/.exec(block[1]);
  if (!value) return null;

  const parsed = Number.parseFloat(value[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
