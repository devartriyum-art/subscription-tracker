import "server-only";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { format } from "date-fns";
import { db } from "@/db";
import { reminderLog, workspaces } from "@/db/schema";
import { getSubscriptionViews } from "./queries";
import { formatMoney, formatDate, type Currency } from "./money";

export type ReminderResult = {
  checked: number;
  sent: { service: string; daysBefore: number; dueDate: string }[];
  skipped: number;
  emailed: boolean;
};

function thresholds(): number[] {
  return (process.env.REMINDER_DAYS ?? "7,1")
    .split(",")
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((v) => Number.isFinite(v));
}

/**
 * spec §5.5 — eşik günlerdeki aktif abonelikleri bulur, reminder_log'da aynı
 * (subscription_id, due_date, days_before) üçlüsü yoksa gönderir ve loglar.
 */
export async function runReminders(today = new Date()): Promise<ReminderResult> {
  const days = thresholds();
  // Sistem görevi: her workspace kendi içinde değerlendirilir.
  const allWorkspaces = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .all();
  const views = (
    await Promise.all(allWorkspaces.map((w) => getSubscriptionViews(w.id, today)))
  ).flat();
  const sent: ReminderResult["sent"] = [];
  let skipped = 0;

  const due = views.filter(
    (v) => v.status === "active" && days.includes(v.days),
  );

  for (const view of due) {
    const dueDate = format(view.renewalDate, "yyyy-MM-dd");

    const existing = await db
      .select()
      .from(reminderLog)
      .where(
        and(
          eq(reminderLog.subscriptionId, view.id),
          eq(reminderLog.dueDate, dueDate),
          eq(reminderLog.daysBefore, view.days),
        ),
      )
      .get();

    if (existing) {
      skipped++;
      continue;
    }

    await db.insert(reminderLog)
      .values({
        id: randomUUID(),
        subscriptionId: view.id,
        dueDate,
        daysBefore: view.days,
        sentAt: Math.floor(Date.now() / 1000),
      })
      .run();

    sent.push({ service: view.service, daysBefore: view.days, dueDate });
  }

  let emailed = false;
  if (sent.length > 0) {
    emailed = await sendEmail(
      `${sent.length} abonelik yenileniyor`,
      due
        .filter((v) => sent.some((s) => s.service === v.service))
        .map(
          (v) =>
            `${v.service} (${v.account.label}) — ${formatDate(v.renewalDate)}, ${v.days} gün, ${formatMoney(v.amount, v.currency as Currency)}`,
        )
        .join("\n"),
    );
  }

  return { checked: views.length, sent, skipped, emailed };
}

async function sendEmail(subject: string, body: string): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER ?? "none";
  const to = (process.env.REMINDER_TO ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (provider !== "resend" || to.length === 0 || !process.env.RESEND_API_KEY) {
    console.log(`[hatırlatma] ${subject}\n${body}`);
    return false;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.REMINDER_FROM ?? "onboarding@resend.dev",
    to,
    subject: `[Abonelik] ${subject}`,
    text: body,
  });

  return true;
}
