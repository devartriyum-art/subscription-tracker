"use client";

import { useState } from "react";
import { recordUsage } from "@/actions/subscriptions";

/** spec §7.2 — hızlı kota işaretleme. Değer anlık görünsün diye client. */
export function UsageSlider({ subscriptionId }: { subscriptionId: string }) {
  const [percent, setPercent] = useState(50);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      action={async (formData: FormData) => {
        setPending(true);
        setMessage(null);
        const result = await recordUsage(formData);
        setPending(false);
        setMessage(result.ok ? "Kota işaretlendi." : result.error);
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="subscriptionId" value={subscriptionId} />

      <label className="text-sm">
        Kullanılan kota: <span className="tabular font-medium">%{percent}</span>
        <input
          name="percent"
          type="range"
          min={0}
          max={100}
          step={5}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="mt-2 w-full accent-[var(--accent)]"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Etiket
          <input
            name="label"
            placeholder="5 saatlik pencere"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Not
          <input
            name="note"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : "Kotayı işaretle"}
        </button>
        {message ? (
          <span className="text-xs text-[var(--muted)]">{message}</span>
        ) : null}
      </div>
    </form>
  );
}
