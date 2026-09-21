"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type MonthPoint = { month: string; total: number };

/** spec §7.4 — son 12 ayın gerçekleşen ödeme toplamı. */
export function PaymentsChart({ data }: { data: MonthPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="var(--muted)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} width={60} />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [
              new Intl.NumberFormat("tr-TR", {
                style: "currency",
                currency: "TRY",
                maximumFractionDigits: 0,
              }).format(Number(value ?? 0)),
              "Toplam",
            ]}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
