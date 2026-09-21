import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { SubscriptionForm } from "@/components/subscription-form";
import { UsageSlider } from "@/components/usage-slider";
import { getAccounts, getSubscriptionDetail } from "@/lib/queries";
import { updateSubscription, recordPayment } from "@/actions/subscriptions";
import { formatDate, formatMoney, type Currency } from "@/lib/money";
import { CYCLE_LABELS } from "@/lib/renewal";

export const dynamic = "force-dynamic";

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const workspaceId = session.user.workspaceId;

  const { id } = await params;
  const detail = await getSubscriptionDetail(id, workspaceId);
  if (!detail) notFound();

  const { view, usage, payments } = detail;
  const accounts = await getAccounts(workspaceId);

  async function update(formData: FormData) {
    "use server";
    await updateSubscription(id, formData);
    redirect(`/subscriptions/${id}`);
  }

  async function addPayment(formData: FormData) {
    "use server";
    await recordPayment(formData);
    redirect(`/subscriptions/${id}`);
  }

  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-5">
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← Panel
        </Link>

        <header>
          <h1 className="text-lg font-semibold">
            {view.service}
            {view.plan ? (
              <span className="text-[var(--muted)]"> · {view.plan}</span>
            ) : null}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {view.account.label} · {view.account.email}
          </p>
          <p className="tabular mt-2 text-sm">
            Sonraki yenilenme: <strong>{formatDate(view.renewalDate)}</strong> (
            {view.days} gün) · {formatMoney(view.amount, view.currency as Currency)}{" "}
            / {CYCLE_LABELS[view.cycle]}
          </p>
        </header>

        <Section title="Kota işaretle">
          <UsageSlider subscriptionId={view.id} />
        </Section>

        <Section title={`Kota geçmişi (${usage.length})`}>
          {usage.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Henüz kota işareti yok.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {usage.map((u) => (
                <li key={u.id} className="flex items-center gap-3 text-sm">
                  <span className="tabular w-28 shrink-0 text-xs text-[var(--muted)]">
                    {formatDate(new Date(u.recordedAt * 1000))}
                  </span>
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--bg)]">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${u.percent}%`,
                        background:
                          u.percent >= 90 ? "var(--critical)" : "var(--accent)",
                      }}
                    />
                  </span>
                  <span className="tabular w-10 text-xs">%{u.percent}</span>
                  <span className="truncate text-xs text-[var(--muted)]">
                    {[u.label, u.note].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`Ödeme geçmişi (${payments.length})`}>
          {payments.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Kayıtlı ödeme yok.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="tabular flex justify-between">
                  <span className="text-[var(--muted)]">
                    {formatDate(p.paidOn)}
                  </span>
                  <span>{formatMoney(p.amount, p.currency as Currency)}</span>
                </li>
              ))}
            </ul>
          )}

          <form
            action={addPayment}
            className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            <input type="hidden" name="subscriptionId" value={view.id} />
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Tutar"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            />
            <select
              name="currency"
              defaultValue={view.currency}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <input
              name="paidOn"
              type="date"
              required
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm hover:border-[var(--accent)]"
            >
              Ödeme ekle
            </button>
          </form>
        </Section>

        <Section title="Düzenle">
          <SubscriptionForm
            accounts={accounts}
            subscription={view}
            action={update}
            submitLabel="Güncelle"
          />
        </Section>
      </main>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}
