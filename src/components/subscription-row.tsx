import Link from "next/link";
import { formatMoney, formatDate, type Currency } from "@/lib/money";
import { CYCLE_LABELS } from "@/lib/renewal";
import { STATUS_TEXT } from "@/lib/validation";
import type { SubscriptionView } from "@/lib/queries";
import { setSubscriptionStatus, deleteSubscription } from "@/actions/subscriptions";

const STATUS_COLOR = {
  overdue: "var(--overdue)",
  critical: "var(--critical)",
  soon: "var(--soon)",
  normal: "var(--muted)",
} as const;

export function SubscriptionRow({ view }: { view: SubscriptionView }) {
  const isActive = view.status === "active";

  return (
    <li
      className="flex flex-col gap-3 border-l-4 border-[var(--border)] bg-[var(--surface)] p-3 sm:flex-row sm:items-center"
      style={{ borderLeftColor: view.account.color }}
    >
      <div className="min-w-0 flex-1">
        <Link
          href={`/subscriptions/${view.id}`}
          className="font-medium hover:underline"
        >
          {view.service}
          {view.plan ? (
            <span className="text-[var(--muted)]"> · {view.plan}</span>
          ) : null}
        </Link>
        <div className="truncate text-xs text-[var(--muted)]">
          {view.account.label} · {view.account.email}
          {view.seats > 1 ? ` · ${view.seats} koltuk` : ""}
        </div>
        {view.lastUsage ? (
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--bg)]"
              aria-hidden
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${view.lastUsage.percent}%`,
                  background:
                    view.lastUsage.percent >= 90
                      ? "var(--critical)"
                      : "var(--accent)",
                }}
              />
            </span>
            <span className="tabular text-xs text-[var(--muted)]">
              kota %{view.lastUsage.percent}
            </span>
          </div>
        ) : null}
      </div>

      <div className="sm:w-32 sm:text-right">
        {isActive ? (
          <>
            <div
              className="tabular text-sm font-medium"
              style={{ color: STATUS_COLOR[view.statusClass] }}
            >
              {view.days < 0 ? "geçti" : `${view.days} gün`}
            </div>
            <div className="tabular text-xs text-[var(--muted)]">
              {formatDate(view.renewalDate)}
            </div>
            {!view.autoRenew && view.statusClass === "critical" ? (
              <span className="mt-1 inline-block rounded border border-[var(--soon)] px-1 text-[10px] text-[var(--soon)]">
                elle yenilenmeli
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-xs text-[var(--muted)]">
            {STATUS_TEXT[view.status]}
          </span>
        )}
      </div>

      <div className="sm:w-32 sm:text-right">
        <div className="tabular text-sm font-medium">
          {formatMoney(view.amount, view.currency as Currency)}
        </div>
        <div className="text-xs text-[var(--muted)]">
          {CYCLE_LABELS[view.cycle]}
        </div>
      </div>

      <div className="flex shrink-0 gap-2 text-xs">
        <Link
          href={`/subscriptions/${view.id}`}
          className="rounded border border-[var(--border)] px-2 py-1 hover:border-[var(--accent)]"
        >
          Düzenle
        </Link>
        <form
          action={async () => {
            "use server";
            await setSubscriptionStatus(view.id, isActive ? "paused" : "active");
          }}
        >
          <button
            type="submit"
            className="rounded border border-[var(--border)] px-2 py-1 hover:border-[var(--accent)]"
          >
            {isActive ? "Pasife al" : "Aktif et"}
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await deleteSubscription(view.id);
          }}
        >
          <button
            type="submit"
            className="rounded border border-[var(--border)] px-2 py-1 text-[var(--critical)] hover:border-[var(--critical)]"
          >
            Sil
          </button>
        </form>
      </div>
    </li>
  );
}
