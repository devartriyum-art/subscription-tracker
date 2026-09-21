"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import { accounts, fxRates } from "@/db/schema";
import { requireSession } from "@/auth";
import { accountSchema, fxRateSchema } from "@/lib/validation";
import type { ActionResult } from "./subscriptions";

function formToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value === "") continue;
    out[key] = value;
  }
  out.archived = formData.get("archived") != null;
  return out;
}

export async function upsertAccount(formData: FormData): Promise<ActionResult> {
  const { workspaceId } = await requireSession();

  const parsed = accountSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };
  }

  const { id, ...values } = parsed.data;

  if (id) {
    // where'e workspace koşulu: başka workspace'in hesabı güncellenemez.
    const owned = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.workspaceId, workspaceId)))
      .get();
    if (!owned) return { ok: false, error: "Hesap bulunamadı" };

    await db.update(accounts)
      .set({ ...values, note: values.note ?? null })
      .where(and(eq(accounts.id, id), eq(accounts.workspaceId, workspaceId)))
      .run();
  } else {
    await db.insert(accounts)
      .values({
        id: randomUUID(),
        workspaceId,
        ...values,
        note: values.note ?? null,
      })
      .run();
  }

  revalidatePath("/accounts");
  revalidatePath("/");
  return { ok: true, id };
}

export async function setFxRate(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const parsed = fxRateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz kur" };
  }

  const date = parsed.data.date ?? format(new Date(), "yyyy-MM-dd");

  await db.insert(fxRates)
    .values({
      currency: parsed.data.currency,
      date,
      rateTry: parsed.data.rateTry,
      source: "manual",
    })
    .onConflictDoUpdate({
      target: [fxRates.currency, fxRates.date],
      set: { rateTry: parsed.data.rateTry, source: "manual" },
    })
    .run();

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/reports");
  return { ok: true };
}
