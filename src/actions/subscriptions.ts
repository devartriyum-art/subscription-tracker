"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { subscriptions, usageSnapshots, payments, accounts } from "@/db/schema";
import { requireSession } from "@/auth";
import {
  subscriptionSchema,
  usageSchema,
  paymentSchema,
  STATUSES,
} from "@/lib/validation";


/**
 * Kaydın oturumdaki workspace'e ait olduğunu doğrular.
 * Ait değilse yokmuş gibi davranır — varlığını sızdırmamak için.
 */
async function assertOwnsSubscription(
  id: string,
  workspaceId: string,
): Promise<boolean> {
  const row = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .innerJoin(accounts, eq(subscriptions.accountId, accounts.id))
    .where(and(eq(subscriptions.id, id), eq(accounts.workspaceId, workspaceId)))
    .get();
  return !!row;
}

/** Hedef hesabın bu workspace'e ait olduğunu doğrular. */
async function assertOwnsAccount(
  accountId: string,
  workspaceId: string,
): Promise<boolean> {
  const row = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.workspaceId, workspaceId)))
    .get();
  return !!row;
}

const DENIED = { ok: false as const, error: "Kayıt bulunamadı" };

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function formToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value === "") continue;
    out[key] = value;
  }
  // Checkbox işaretli değilse FormData'da hiç görünmez.
  out.autoRenew = formData.get("autoRenew") != null;
  return out;
}

function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Geçersiz giriş";
}

export async function createSubscription(
  formData: FormData,
): Promise<ActionResult> {
  const { workspaceId } = await requireSession();

  const parsed = subscriptionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (!(await assertOwnsAccount(parsed.data.accountId, workspaceId))) return DENIED;

  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();

  await db.insert(subscriptions)
    .values({
      id,
      ...parsed.data,
      plan: parsed.data.plan ?? null,
      url: parsed.data.url ?? null,
      note: parsed.data.note ?? null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/reports");
  return { ok: true, id };
}

export async function updateSubscription(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { workspaceId } = await requireSession();
  if (!(await assertOwnsSubscription(id, workspaceId))) return DENIED;

  const parsed = subscriptionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (!(await assertOwnsAccount(parsed.data.accountId, workspaceId))) return DENIED;

  await db.update(subscriptions)
    .set({
      ...parsed.data,
      plan: parsed.data.plan ?? null,
      url: parsed.data.url ?? null,
      note: parsed.data.note ?? null,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(subscriptions.id, id))
    .run();

  revalidatePath("/");
  revalidatePath(`/subscriptions/${id}`);
  revalidatePath("/accounts");
  revalidatePath("/reports");
  return { ok: true, id };
}

export async function setSubscriptionStatus(
  id: string,
  status: (typeof STATUSES)[number],
): Promise<ActionResult> {
  const { workspaceId } = await requireSession();
  if (!STATUSES.includes(status)) return { ok: false, error: "Geçersiz durum" };
  if (!(await assertOwnsSubscription(id, workspaceId))) return DENIED;

  await db.update(subscriptions)
    .set({
      status,
      cancelledAt:
        status === "cancelled" ? format(new Date(), "yyyy-MM-dd") : null,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(subscriptions.id, id))
    .run();

  revalidatePath("/");
  revalidatePath(`/subscriptions/${id}`);
  revalidatePath("/reports");
  return { ok: true, id };
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  const { workspaceId } = await requireSession();
  if (!(await assertOwnsSubscription(id, workspaceId))) return DENIED;

  // Bağlı kayıtlar önce silinir (FK restrict/cascade karışmasın).
  await db.delete(usageSnapshots).where(eq(usageSnapshots.subscriptionId, id)).run();
  await db.delete(payments).where(eq(payments.subscriptionId, id)).run();
  await db.delete(subscriptions).where(eq(subscriptions.id, id)).run();

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/reports");
  return { ok: true };
}

export async function recordUsage(formData: FormData): Promise<ActionResult> {
  const { userId, workspaceId } = await requireSession();

  const parsed = usageSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (!(await assertOwnsSubscription(parsed.data.subscriptionId, workspaceId)))
    return DENIED;

  await db.insert(usageSnapshots)
    .values({
      id: randomUUID(),
      subscriptionId: parsed.data.subscriptionId,
      percent: parsed.data.percent,
      label: parsed.data.label ?? null,
      note: parsed.data.note ?? null,
      recordedBy: userId,
      recordedAt: Math.floor(Date.now() / 1000),
    })
    .run();

  revalidatePath("/");
  revalidatePath(`/subscriptions/${parsed.data.subscriptionId}`);
  return { ok: true };
}

export async function recordPayment(formData: FormData): Promise<ActionResult> {
  const { workspaceId } = await requireSession();

  const parsed = paymentSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (!(await assertOwnsSubscription(parsed.data.subscriptionId, workspaceId)))
    return DENIED;

  await db.insert(payments)
    .values({
      id: randomUUID(),
      subscriptionId: parsed.data.subscriptionId,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      paidOn: parsed.data.paidOn,
      fxRateTry: parsed.data.fxRateTry ?? null,
      note: parsed.data.note ?? null,
    })
    .run();

  revalidatePath(`/subscriptions/${parsed.data.subscriptionId}`);
  revalidatePath("/reports");
  return { ok: true };
}
