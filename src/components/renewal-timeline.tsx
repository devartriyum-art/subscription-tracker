import { formatDate } from "@/lib/money";
import type { SubscriptionView } from "@/lib/queries";

/**
 * spec §7.1 — 60 günlük zaman şeridi. Mobilde 30 güne düşer: iki ayrı şerit
 * render edilip CSS ile gösterilir (sunucu bileşeni, JS gerekmez).
 */
export function RenewalTimeline({ views }: { views: SubscriptionView[] }) {
  const active = views.filter((v) => v.status === "active" && v.days >= 0);

  if (active.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Önümüzdeki dönemde yenilenme yok.
      </p>
    );
  }

  const nearest = active.slice(0, 3);

  return (
    <section
      aria-label="Yenilenme zaman şeridi"
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Yaklaşan yenilenmeler</h2>
        <span className="text-xs text-[var(--muted)]">
          <span className="sm:hidden">30 gün</span>
          <span className="hidden sm:inline">60 gün</span>
        </span>
      </div>

      <Strip views={active} span={30} className="sm:hidden" />
      <Strip views={active} span={60} className="hidden sm:block" />

      <ul className="mt-3 flex flex-col gap-1 text-xs text-[var(--muted)]">
        {nearest.map((v) => (
          <li key={v.id} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ background: v.account.color }}
            />
            <span className="truncate">
              {v.service} — {formatDate(v.renewalDate)} ({v.days} gün)
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Strip({
  views,
  span,
  className,
}: {
  views: SubscriptionView[];
  span: number;
  className?: string;
}) {
  const inRange = views.filter((v) => v.days <= span);

  return (
    <div className={className}>
      <div className="relative mt-4 h-8 rounded-full bg-[var(--bg)]">
        {inRange.map((v) => (
          <span
            key={v.id}
            title={`${v.service} — ${formatDate(v.renewalDate)}`}
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--surface)]"
            style={{
              left: `${Math.min(98, Math.max(2, (v.days / span) * 100))}%`,
              background: v.account.color,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
        <span>bugün</span>
        <span>{span} gün</span>
      </div>
    </div>
  );
}
