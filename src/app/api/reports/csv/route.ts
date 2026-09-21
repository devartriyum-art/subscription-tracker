import { NextResponse } from "next/server";
import { format } from "date-fns";
import { auth } from "@/auth";
import { getSubscriptionViews } from "@/lib/queries";
import { monthlyEquivalent } from "@/lib/money";
import { CYCLE_LABELS } from "@/lib/renewal";
import { CATEGORY_LABELS, STATUS_TEXT } from "@/lib/validation";

export const dynamic = "force-dynamic";

function escapeCell(value: string | number): string {
  const text = String(value);
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const header = [
    "Servis",
    "Plan",
    "Hesap",
    "Kategori",
    "Tutar",
    "Para birimi",
    "Döngü",
    "Aylık eşdeğer",
    "Sonraki yenilenme",
    "Kalan gün",
    "Durum",
  ];

  const lines = [header.join(";")];

  for (const v of await getSubscriptionViews(session.user.workspaceId)) {
    lines.push(
      [
        v.service,
        v.plan ?? "",
        v.account.label,
        CATEGORY_LABELS[v.category],
        v.amount.toFixed(2),
        v.currency,
        CYCLE_LABELS[v.cycle],
        monthlyEquivalent(v.amount, v.cycle).toFixed(2),
        format(v.renewalDate, "yyyy-MM-dd"),
        v.days,
        STATUS_TEXT[v.status],
      ]
        .map(escapeCell)
        .join(";"),
    );
  }

  // Excel'in UTF-8 Türkçe karakterleri doğru okuması için BOM.
  const csv = "﻿" + lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="abonelikler-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
