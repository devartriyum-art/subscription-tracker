import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  subscriptions,
  usageSnapshots,
  payments,
  fxRates,
  type Account,
  type Subscription,
} from "@/db/schema";
import { nextRenewal, daysLeft, renewalStatus, type RenewalStatus } from "./renewal";
import { latestRates, totalsByCurrency, toTry, type Currency } from "./money";

export type SubscriptionView = Subscription & {
  account: Account;
  renewalDate: Date;
  days: number;
  statusClass: RenewalStatus;
  lastUsage: { percent: number; recordedAt: number } | null;
};

/**
 * Bir workspace'in abonelikleri, hesap bilgisi ve hesaplanmış yenilenme verisiyle.
 * workspaceId zorunludur — izolasyonun tek dayanağı budur.
 */
export async function getSubscriptionViews(
  workspaceId: string,
  today = new Date(),
): Promise<SubscriptionView[]> {
  const rows = await db
    .select()
    .from(subscriptions)
    .innerJoin(accounts, eq(subscriptions.accountId, accounts.id))
    .where(eq(accounts.workspaceId, workspaceId))
    .all();

  const subIds = rows.map((r) => r.subscriptions.id);
  const usage = subIds.length
    ? await db
        .select()
        .from(usageSnapshots)
        .where(inArray(usageSnapshots.subscriptionId, subIds))
        .orderBy(desc(usageSnapshots.recordedAt))
        .all()
    : [];

  const lastBySub = new Map<string, { percent: number; recordedAt: number }>();
  for (const u of usage) {
    if (!lastBySub.has(u.subscriptionId)) {
      lastBySub.set(u.subscriptionId, {
        percent: u.percent,
        recordedAt: u.recordedAt,
      });
    }
  }

  return rows
    .map((r) => {
      const sub = r.subscriptions;
      const renewalDate = nextRenewal(sub.anchorDate, sub.cycle, today);
      const days = daysLeft(renewalDate, today);
      return {
        ...sub,
        account: r.accounts,
        renewalDate,
        days,
        statusClass: renewalStatus(days),
        lastUsage: lastBySub.get(sub.id) ?? null,
      };
    })
    .sort((a, b) => a.days - b.days);
}

export async function getAccounts(workspaceId: string): Promise<Account[]> {
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.workspaceId, workspaceId))
    .orderBy(accounts.label)
    .all();
}

export async function getLatestRates() {
  const rows = await db.select().from(fxRates).all();
  return latestRates(rows);
}

export async function getAllRates() {
  return db.select().from(fxRates).orderBy(desc(fxRates.date)).all();
}

/** spec §7.1 — panel üst şeridindeki özet rakamlar. */
export async function getSummary(views: SubscriptionView[]) {
  const active = views.filter((v) => v.status === "active");

  const totals = totalsByCurrency(
    views.map((v) => ({
      amount: v.amount,
      cycle: v.cycle,
      currency: v.currency as Currency,
      status: v.status,
    })),
  );

  const rates = await getLatestRates();
  const converted = toTry(totals, rates);

  // Önümüzdeki 30 günde çıkacak nakit, para birimi bazında.
  const upcoming: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };
  for (const v of active) {
    if (v.days >= 0 && v.days <= 30) {
      upcoming[v.currency as Currency] += v.amount;
    }
  }
  const upcomingTry = toTry(upcoming, rates);

  return {
    totals,
    converted,
    rates,
    upcoming,
    upcomingTry,
    activeCount: active.length,
    criticalCount: active.filter((v) => v.statusClass === "critical").length,
  };
}

export async function getSubscriptionDetail(
  id: string,
  workspaceId: string,
  today = new Date(),
) {
  // Başka workspace'in kaydı istenirse bulunamamış gibi davranılır.
  const view = (await getSubscriptionViews(workspaceId, today)).find(
    (v) => v.id === id,
  );
  if (!view) return null;

  const usage = await db
    .select()
    .from(usageSnapshots)
    .where(eq(usageSnapshots.subscriptionId, id))
    .orderBy(desc(usageSnapshots.recordedAt))
    .all();

  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.subscriptionId, id))
    .orderBy(desc(payments.paidOn))
    .all();

  return { view, usage, payments: paymentRows };
}
