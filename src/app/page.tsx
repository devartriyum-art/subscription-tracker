import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { SummaryCards } from "@/components/summary-cards";
import { RenewalTimeline } from "@/components/renewal-timeline";
import { SubscriptionRow } from "@/components/subscription-row";
import { getSubscriptionViews, getAccounts, getSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const workspaceId = session.user.workspaceId;

  const { account } = await searchParams;
  const views = await getSubscriptionViews(workspaceId);
  const accounts = await getAccounts(workspaceId);
  const summary = await getSummary(views);

  const filtered = account ? views.filter((v) => v.accountId === account) : views;

  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-5">
        <RenewalTimeline views={views} />
        <SummaryCards summary={summary} />

        <nav aria-label="Hesap filtresi" className="flex flex-wrap gap-2">
          <FilterChip href="/" active={!account} label="Tümü" />
          {accounts.map((a) => (
            <FilterChip
              key={a.id}
              href={`/?account=${a.id}`}
              active={account === a.id}
              label={a.label}
              color={a.color}
            />
          ))}
        </nav>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">
              Abonelikler{" "}
              <span className="text-[var(--muted)]">({filtered.length})</span>
            </h2>
            <Link
              href="/subscriptions/new"
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
            >
              Yeni abonelik
            </Link>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
              Henüz kayıt yok. İlk aboneliği ekle — hesap, tutar ve bir sonraki
              yenilenme tarihi yeterli.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 overflow-hidden rounded-xl border border-[var(--border)]">
              {filtered.map((view) => (
                <SubscriptionRow key={view.id} view={view} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function FilterChip({
  href,
  active,
  label,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
        active
          ? "border-[var(--accent)] text-[var(--text)]"
          : "border-[var(--border)] text-[var(--muted)]"
      }`}
    >
      {color ? (
        <span
          aria-hidden
          className="inline-block size-2 rounded-full"
          style={{ background: color }}
        />
      ) : null}
      {label}
    </Link>
  );
}
