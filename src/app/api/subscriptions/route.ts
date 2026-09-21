import { NextResponse } from "next/server";
import { format } from "date-fns";
import { auth } from "@/auth";
import { getSubscriptionViews } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const views = (await getSubscriptionViews(session.user.workspaceId)).map((v) => ({
    id: v.id,
    service: v.service,
    plan: v.plan,
    account: v.account.label,
    amount: v.amount,
    currency: v.currency,
    cycle: v.cycle,
    anchorDate: v.anchorDate,
    // toISOString UTC'ye kaydırır; yerel tarih korunmalı.
    nextRenewal: format(v.renewalDate, "yyyy-MM-dd"),
    daysLeft: v.days,
    status: v.status,
  }));

  return NextResponse.json({ count: views.length, subscriptions: views });
}
