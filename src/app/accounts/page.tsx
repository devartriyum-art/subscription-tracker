import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { getAccounts, getSubscriptionViews } from "@/lib/queries";
import { upsertAccount } from "@/actions/settings";
import { monthlyEquivalent, formatMoney, CURRENCIES, type Currency } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const workspaceId = session.user.workspaceId;

  const accounts = await getAccounts(workspaceId);
  const views = await getSubscriptionViews(workspaceId);

  async function save(formData: FormData) {
    "use server";
    await upsertAccount(formData);
    redirect("/accounts");
  }

  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-5">
        <h1 className="text-lg font-semibold">Hesaplar</h1>

        <ul className="flex flex-col gap-3">
          {accounts.map((account) => {
            const own = views.filter(
              (v) => v.accountId === account.id && v.status === "active",
            );
            const totals: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };
            for (const v of own) {
              totals[v.currency as Currency] += monthlyEquivalent(v.amount, v.cycle);
            }

            return (
              <li
                key={account.id}
                className="rounded-xl border border-l-4 border-[var(--border)] bg-[var(--surface)] p-4"
                style={{ borderLeftColor: account.color }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="font-medium">{account.label}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {account.email}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="tabular">
                      {CURRENCIES.filter((c) => totals[c] > 0)
                        .map((c) => formatMoney(totals[c], c))
                        .join(" + ") || "—"}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      aylık · {own.length} abonelik
                    </div>
                  </div>
                </div>

                <form
                  action={save}
                  className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  <input type="hidden" name="id" value={account.id} />
                  <input
                    name="label"
                    defaultValue={account.label}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                  />
                  <input
                    name="email"
                    type="email"
                    defaultValue={account.email}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                  />
                  <input
                    name="color"
                    type="color"
                    defaultValue={account.color}
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm hover:border-[var(--accent)]"
                  >
                    Kaydet
                  </button>
                  <input
                    name="note"
                    defaultValue={account.note ?? ""}
                    placeholder="Not (ör. kart son 4 hane)"
                    className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm sm:col-span-4"
                  />
                </form>
              </li>
            );
          })}
        </ul>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-sm font-medium">Yeni hesap</h2>
          <form action={save} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input
              name="label"
              required
              placeholder="etiket"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="e-posta"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            />
            <input
              name="color"
              type="color"
              defaultValue="#2F6FED"
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-2 py-1.5 text-sm font-medium text-white"
            >
              Ekle
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
