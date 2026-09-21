"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { eq, inArray } from "drizzle-orm";
import {
  accounts,
  subscriptions,
  usageSnapshots,
  payments,
  fxRates,
} from "@/db/schema";
import { requireSession } from "@/auth";
import type { ActionResult } from "./subscriptions";

/**
 * spec §13 — JSON yedek geri yüklendiğinde veri birebir aynı olmalı.
 * Tüm tablolar tek transaction içinde temizlenip yeniden yazılır.
 */
export async function restoreBackup(formData: FormData): Promise<ActionResult> {
  const { workspaceId } = await requireSession();

  const file = formData.get("backup");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Yedek dosyası seçilmedi" };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "Dosya geçerli bir JSON değil" };
  }

  // Yedekteki workspace_id ne olursa olsun, içe aktarım oturumun workspace'ine bağlanır.
  const rows = {
    accounts: asArray(payload.accounts).map((a) => ({ ...a, workspaceId })),
    subscriptions: asArray(payload.subscriptions),
    usageSnapshots: asArray(payload.usageSnapshots),
    payments: asArray(payload.payments),
    fxRates: asArray(payload.fxRates),
  };

  if (rows.accounts.length === 0) {
    return { ok: false, error: "Yedekte hesap kaydı yok — geri yükleme iptal" };
  }

  try {
    await db.transaction(async (tx) => {
      // Sıra önemli: FK bağımlılığı olan tablolar önce silinir.
      // Yalnızca bu workspace'in verisi silinir.
      const ownAccounts = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.workspaceId, workspaceId))
        .all()
        .map((a) => a.id);
      const ownSubs = ownAccounts.length
        ? await tx
            .select({ id: subscriptions.id })
            .from(subscriptions)
            .where(inArray(subscriptions.accountId, ownAccounts))
            .all()
            .map((s) => s.id)
        : [];
      if (ownSubs.length) {
        await tx.delete(usageSnapshots).where(inArray(usageSnapshots.subscriptionId, ownSubs)).run();
        await tx.delete(payments).where(inArray(payments.subscriptionId, ownSubs)).run();
        await tx.delete(subscriptions).where(inArray(subscriptions.id, ownSubs)).run();
      }
      await tx.delete(fxRates).run();
      if (ownAccounts.length)
        await tx.delete(accounts).where(inArray(accounts.id, ownAccounts)).run();

      if (rows.accounts.length)
        await tx.insert(accounts).values(rows.accounts as never).run();
      if (rows.subscriptions.length)
        await tx.insert(subscriptions).values(rows.subscriptions as never).run();
      if (rows.usageSnapshots.length)
        await tx.insert(usageSnapshots).values(rows.usageSnapshots as never).run();
      if (rows.payments.length)
        await tx.insert(payments).values(rows.payments as never).run();
      if (rows.fxRates.length)
        await tx.insert(fxRates).values(rows.fxRates as never).run();
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Geri yükleme başarısız",
    };
  }

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/reports");
  revalidatePath("/settings");
  return { ok: true };
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}
