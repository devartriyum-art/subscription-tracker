import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { format } from "date-fns";
import { db } from "@/db";
import { fxRates } from "@/db/schema";
import { fetchTcmbRates } from "@/lib/fx-tcmb";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const rates = await fetchTcmbRates();
    const date = format(new Date(), "yyyy-MM-dd");

    for (const rate of rates) {
      await db.insert(fxRates)
        .values({
          currency: rate.currency,
          date,
          rateTry: rate.rateTry,
          source: "tcmb",
        })
        .onConflictDoUpdate({
          target: [fxRates.currency, fxRates.date],
          set: { rateTry: rate.rateTry, source: "tcmb" },
        })
        .run();
    }

    return NextResponse.json({ date, rates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      { status: 502 },
    );
  }
}
