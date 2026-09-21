import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { format } from "date-fns";
import { db } from "@/db";
import { fxRates } from "@/db/schema";
import { fetchTcmbRates } from "@/lib/fx-tcmb";
import { runReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron tek uç çağırır (ücretsiz katmanda günlük 1 cron sınırı).
 * Kur + hatırlatma birlikte çalışır. 06:00 UTC = 09:00 Europe/Istanbul.
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

async function handle(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const result: Record<string, unknown> = {};

  // Kur hatası hatırlatmayı engellemesin.
  try {
    const rates = await fetchTcmbRates();
    const date = format(new Date(), "yyyy-MM-dd");
    for (const rate of rates) {
      await db
        .insert(fxRates)
        .values({ currency: rate.currency, date, rateTry: rate.rateTry, source: "tcmb" })
        .onConflictDoUpdate({
          target: [fxRates.currency, fxRates.date],
          set: { rateTry: rate.rateTry, source: "tcmb" },
        })
        .run();
    }
    result.fx = { date, rates };
  } catch (error) {
    result.fx = { error: error instanceof Error ? error.message : "bilinmeyen" };
  }

  try {
    result.reminders = await runReminders();
  } catch (error) {
    result.reminders = { error: error instanceof Error ? error.message : "bilinmeyen" };
  }

  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
