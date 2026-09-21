import type { Account, Subscription } from "@/db/schema";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CURRENCY_VALUES,
  CYCLES,
  STATUSES,
  STATUS_TEXT,
} from "@/lib/validation";
import { CYCLE_LABELS } from "@/lib/renewal";

const field =
  "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm";

export function SubscriptionForm({
  accounts,
  subscription,
  action,
  submitLabel,
}: {
  accounts: Account[];
  subscription?: Subscription;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  const s = subscription;

  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-sm">
        Servis *
        <input
          name="service"
          required
          defaultValue={s?.service}
          placeholder="Claude"
          className={field}
        />
      </label>

      <label className="text-sm">
        Plan
        <input
          name="plan"
          defaultValue={s?.plan ?? ""}
          placeholder="Max 20x"
          className={field}
        />
      </label>

      <label className="text-sm">
        Hesap *
        <select
          name="accountId"
          required
          defaultValue={s?.accountId ?? ""}
          className={field}
        >
          <option value="" disabled>
            Seçin
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} — {a.email}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        Kategori
        <select
          name="category"
          defaultValue={s?.category ?? "other"}
          className={field}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        Tutar *
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={s?.amount ?? ""}
          className={field}
        />
      </label>

      <label className="text-sm">
        Para birimi
        <select
          name="currency"
          defaultValue={s?.currency ?? "TRY"}
          className={field}
        >
          {CURRENCY_VALUES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        Döngü
        <select name="cycle" defaultValue={s?.cycle ?? "monthly"} className={field}>
          {CYCLES.map((c) => (
            <option key={c} value={c}>
              {CYCLE_LABELS[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        İlk ödeme / referans tarih *
        <input
          name="anchorDate"
          type="date"
          required
          defaultValue={s?.anchorDate ?? ""}
          className={field}
        />
        <span className="mt-1 block text-xs text-[var(--muted)]">
          Bu tarih değişmez; sonraki yenilenmeler buradan hesaplanır.
        </span>
      </label>

      <label className="text-sm">
        Koltuk
        <input
          name="seats"
          type="number"
          min="1"
          defaultValue={s?.seats ?? 1}
          className={field}
        />
      </label>

      <label className="text-sm">
        Durum
        <select name="status" defaultValue={s?.status ?? "active"} className={field}>
          {STATUSES.map((v) => (
            <option key={v} value={v}>
              {STATUS_TEXT[v]}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm sm:col-span-2">
        Fatura / hesap adresi
        <input
          name="url"
          type="url"
          defaultValue={s?.url ?? ""}
          placeholder="https://"
          className={field}
        />
      </label>

      <label className="text-sm sm:col-span-2">
        Not
        <textarea
          name="note"
          rows={2}
          defaultValue={s?.note ?? ""}
          className={field}
        />
        <span className="mt-1 block text-xs text-[var(--muted)]">
          Kart numarası yazmayın — yalnızca son 4 hane yeterlidir.
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          name="autoRenew"
          type="checkbox"
          defaultChecked={s ? s.autoRenew : true}
          className="size-4"
        />
        Otomatik yenileniyor
      </label>

      <div className="sm:col-span-2">
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
