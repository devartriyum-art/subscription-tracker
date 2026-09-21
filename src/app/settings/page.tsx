import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { getAllRates, getLatestRates } from "@/lib/queries";
import { setFxRate } from "@/actions/settings";
import { restoreBackup } from "@/actions/backup";
import { formatDate } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { msg } = await searchParams;
  const rates = await getAllRates();
  const latest = await getLatestRates();

  async function saveRate(formData: FormData) {
    "use server";
    const result = await setFxRate(formData);
    redirect(
      `/settings?msg=${encodeURIComponent(result.ok ? "Kur kaydedildi." : result.error)}`,
    );
  }

  async function restore(formData: FormData) {
    "use server";
    const result = await restoreBackup(formData);
    redirect(
      `/settings?msg=${encodeURIComponent(result.ok ? "Yedek geri yüklendi." : result.error)}`,
    );
  }

  const reminderDays = process.env.REMINDER_DAYS ?? "7,1";
  const emailProvider = process.env.EMAIL_PROVIDER ?? "none";
  const reminderTo = process.env.REMINDER_TO || "—";

  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-5">
        <h1 className="text-lg font-semibold">Ayarlar</h1>

        {msg ? (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            {msg}
          </p>
        ) : null}

        <Section title="Kur">
          <p className="mb-3 text-sm text-[var(--muted)]">
            Güncel: USD{" "}
            <strong className="tabular">{latest.USD ?? "girilmedi"}</strong> · EUR{" "}
            <strong className="tabular">{latest.EUR ?? "girilmedi"}</strong>
          </p>

          <form action={saveRate} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              name="currency"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <input
              name="rateTry"
              type="number"
              step="0.0001"
              min="0"
              required
              placeholder="1 birim = ? TL"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            />
            <input
              name="date"
              type="date"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-2 py-1.5 text-sm font-medium text-white"
            >
              Kaydet
            </button>
          </form>

          <p className="mt-3 text-xs text-[var(--muted)]">
            TCMB&apos;den otomatik çekmek için:{" "}
            <code className="rounded bg-[var(--bg)] px-1">
              curl -X POST localhost:3000/api/cron/fx -H &quot;x-cron-secret:
              $CRON_SECRET&quot;
            </code>
          </p>

          {rates.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1 text-xs text-[var(--muted)]">
              {rates.slice(0, 8).map((r) => (
                <li key={`${r.currency}-${r.date}`} className="tabular">
                  {formatDate(r.date)} · {r.currency} · {r.rateTry} ({r.source})
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section title="Hatırlatma">
          <ul className="flex flex-col gap-1 text-sm text-[var(--muted)]">
            <li>
              Eşik günler: <strong className="text-[var(--text)]">{reminderDays}</strong>
            </li>
            <li>
              E-posta sağlayıcı:{" "}
              <strong className="text-[var(--text)]">{emailProvider}</strong>
            </li>
            <li>
              Alıcılar: <strong className="text-[var(--text)]">{reminderTo}</strong>
            </li>
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Bu değerler <code className="rounded bg-[var(--bg)] px-1">.env</code>{" "}
            dosyasından okunur (REMINDER_DAYS, EMAIL_PROVIDER, REMINDER_TO).
          </p>
        </Section>

        <Section title="Yedek">
          <div className="flex flex-col gap-4">
            <div>
              <a
                href="/api/export"
                className="inline-block rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
              >
                JSON yedek indir
              </a>
            </div>

            <form action={restore} className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                name="backup"
                accept="application/json"
                required
                className="text-sm"
              />
              <button
                type="submit"
                className="rounded-lg border border-[var(--critical)] px-3 py-1.5 text-sm text-[var(--critical)]"
              >
                Geri yükle
              </button>
              <span className="w-full text-xs text-[var(--muted)]">
                Geri yükleme mevcut abonelik, hesap, kota ve ödeme kayıtlarının
                tamamını siler ve yedektekiyle değiştirir.
              </span>
            </form>
          </div>
        </Section>
      </main>
    </>
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
