import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  subscriptions,
  usageSnapshots,
  payments,
  fxRates,
} from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  // Kullanıcı parolaları yedeğe dahil edilmez; yalnızca kendi workspace verisi.
  const workspaceId = session.user.workspaceId;
  const ownAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.workspaceId, workspaceId))
    .all();
  const accountIds = ownAccounts.map((a) => a.id);
  const ownSubs = accountIds.length
    ? await db.select().from(subscriptions).where(inArray(subscriptions.accountId, accountIds)).all()
    : [];
  const subIds = ownSubs.map((s) => s.id);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 2,
    accounts: ownAccounts,
    subscriptions: ownSubs,
    usageSnapshots: subIds.length
      ? await db.select().from(usageSnapshots).where(inArray(usageSnapshots.subscriptionId, subIds)).all()
      : [],
    payments: subIds.length
      ? await db.select().from(payments).where(inArray(payments.subscriptionId, subIds)).all()
      : [],
    fxRates: await db.select().from(fxRates).all(),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="abonelik-yedek-${payload.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
