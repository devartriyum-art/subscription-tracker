import { redirect } from "next/navigation";
import { subMonths, format } from "date-fns";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { PaymentsChart, type MonthPoint } from "@/components/payments-chart";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { getSubscriptionViews, getAccounts, getLatestRates } from "@/lib/queries";
import { monthlyEquivalent, toTry, formatMoney, type Currency } from "@/lib/money";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const workspaceId = session.user.workspaceId;

  const views = (await getSubscriptionViews(workspaceId)).filter((v) => v.status === "active");
  const accounts = await getAccounts(workspaceId);
  const rates = await getLatestRates();

  // Kategori bazında aylık TL dağılımı
  const byCategory = CATEGORIES.map((category) => {
    const totals: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };
    for (const v of views.filter((v) => v.category === category)) {
      totals[v.currency as Currency] += monthlyEquivalent(v.amount, v.cycle);
    }
    const converted = toTry(totals, rates);
    return { key: category, label: CATEGORY_LABELS[category], ...converted };
  }).filter((row) => row.total > 0 || row.missing.length > 0);

  // Hesap bazında aylık TL dağılımı
  const byAccount = accounts
    .map((account) => {
      const totals: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };
      for (const v of views.filter((v) => v.accountId === account.id)) {
        totals[v.currency as Currency] += monthlyEquivalent(v.amount, v.cycle);
      }
      const converted = toTry(totals, rates);
      return { key: account.id, label: account.label, color: account.color, ...converted };
    })
    .filter((row) => row.total > 0 || row.missing.length > 0);

  // Son 12 ayın gerçekleşen ödemeleri (TL'ye çevrilmiş)
  const rows = await db.select().from(payments).all();
  const months: MonthPoint[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const month = format(subMonths(now, i), "yyyy-MM");
    const total = rows
      .filter((p) => p.paidOn.startsWith(month))
      .reduce((sum, p) => {
        const rate =
          p.fxRateTry ?? (p.currency === "TRY" ? 1 : rates[p.currency as Currency]);
        return rate == null ? sum : sum + p.amount * rate;
      }, 0);
    months.push({ month: format(subMonths(now, i), "MMM yy"), total });
  }

  const maxCategory = Math.max(...byCategory.map((r) => r.total), 1);
  const maxAccount = Math.max(...byAccount.map((r) => r.total), 1);

  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Raporlar</h1>
          <a
            href="/api/reports/csv"
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
          >
            CSV indir
          </a>
        </div>

        <Section title="Kategori bazında aylık">
          <Bars rows={byCategory} max={maxCategory} />
        </Section>

        <Section title="Hesap bazında aylık">
          <Bars rows={byAccount} max={maxAccount} />
        </Section>

        <Section title="Son 12 ayın gerçekleşen ödemeleri">
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Henüz ödeme kaydı yok. Abonelik detayından ödeme ekleyebilirsiniz.
            </p>
          ) : (
            <PaymentsChart data={months} />
          )}
        </Section>
      </main>
    </>
  );
}

function Bars({
  rows,
  max,
}: {
  rows: { key: string; label: string; total: number; missing: Currency[]; color?: string }[];
  max: number;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Aktif abonelik yok.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 truncate">{row.label}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg)]">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(row.total / max) * 100}%`,
                background: row.color ?? "var(--accent)",
              }}
            />
          </span>
          <span className="tabular w-28 shrink-0 text-right text-xs">
            {formatMoney(row.total, "TRY")}
            {row.missing.length > 0 ? (
              <span className="block text-[var(--soon)]">
                {row.missing.join(",")} kuru yok
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}
