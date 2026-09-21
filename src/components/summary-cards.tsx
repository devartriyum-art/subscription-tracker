import { formatMoney, CURRENCIES, type Currency } from "@/lib/money";
import type { getSummary } from "@/lib/queries";

type Summary = Awaited<ReturnType<typeof getSummary>>;

export function SummaryCards({ summary }: { summary: Summary }) {
  const perCurrency = CURRENCIES.filter((c) => summary.totals[c] > 0);

  return (
    <section aria-label="Özet" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card title="Aylık yük">
        {perCurrency.length === 0 ? (
          <span className="text-[var(--muted)]">—</span>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {perCurrency.map((c) => (
              <li key={c} className="tabular text-base font-semibold">
                {formatMoney(summary.totals[c], c)}
              </li>
            ))}
          </ul>
        )}
        <TryLine
          value={summary.converted.total}
          missing={summary.converted.missing}
        />
      </Card>

      <Card title="30 günde çıkacak">
        {CURRENCIES.filter((c) => summary.upcoming[c] > 0).length === 0 ? (
          <span className="text-[var(--muted)]">—</span>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {CURRENCIES.filter((c) => summary.upcoming[c] > 0).map((c) => (
              <li key={c} className="tabular text-base font-semibold">
                {formatMoney(summary.upcoming[c], c)}
              </li>
            ))}
          </ul>
        )}
        <TryLine
          value={summary.upcomingTry.total}
          missing={summary.upcomingTry.missing}
        />
      </Card>

      <Card title="Aktif abonelik">
        <span className="tabular text-2xl font-semibold">
          {summary.activeCount}
        </span>
      </Card>

      <Card title="Kritik">
        <span
          className="tabular text-2xl font-semibold"
          style={{
            color: summary.criticalCount > 0 ? "var(--critical)" : undefined,
          }}
        >
          {summary.criticalCount}
        </span>
        <span className="text-xs text-[var(--muted)]">3 gün ve altı</span>
      </Card>
    </section>
  );
}

/** spec §5.3 — kur eksikse uydurma kur yerine açık uyarı. */
function TryLine({ value, missing }: { value: number; missing: Currency[] }) {
  if (missing.length > 0) {
    return (
      <span className="mt-1 block text-xs text-[var(--soon)]">
        {missing.join(", ")} kuru girilmedi — TL toplamı eksik.{" "}
        <a href="/settings" className="underline">
          Kur gir
        </a>
      </span>
    );
  }
  return (
    <span className="tabular mt-1 block text-xs text-[var(--muted)]">
      ≈ {formatMoney(value, "TRY")}
    </span>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <span className="text-xs text-[var(--muted)]">{title}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}
