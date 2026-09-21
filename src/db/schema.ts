import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "restrict" }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "restrict" }),
  label: text("label").notNull(),
  email: text("email").notNull(),
  color: text("color").notNull().default("#2F6FED"),
  note: text("note"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
});

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    service: text("service").notNull(),
    plan: text("plan"),
    category: text("category", {
      enum: ["ai", "design", "dev", "office", "other"],
    })
      .notNull()
      .default("other"),
    amount: real("amount").notNull().default(0),
    currency: text("currency", { enum: ["TRY", "USD", "EUR"] })
      .notNull()
      .default("TRY"),
    cycle: text("cycle", {
      enum: ["monthly", "quarterly", "yearly", "once"],
    })
      .notNull()
      .default("monthly"),
    anchorDate: text("anchor_date").notNull(), // YYYY-MM-DD, asla değişmez
    autoRenew: integer("auto_renew", { mode: "boolean" })
      .notNull()
      .default(true),
    seats: integer("seats").notNull().default(1),
    url: text("url"),
    note: text("note"),
    status: text("status", { enum: ["active", "paused", "cancelled"] })
      .notNull()
      .default("active"),
    cancelledAt: text("cancelled_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("subscriptions_account_idx").on(t.accountId),
    index("subscriptions_status_idx").on(t.status),
  ],
);

export const usageSnapshots = sqliteTable(
  "usage_snapshots",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    percent: integer("percent").notNull(),
    label: text("label"),
    note: text("note"),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    recordedAt: integer("recorded_at").notNull(),
  },
  (t) => [index("usage_subscription_idx").on(t.subscriptionId)],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    currency: text("currency", { enum: ["TRY", "USD", "EUR"] }).notNull(),
    paidOn: text("paid_on").notNull(), // YYYY-MM-DD
    fxRateTry: real("fx_rate_try"),
    note: text("note"),
  },
  (t) => [index("payments_subscription_idx").on(t.subscriptionId)],
);

export const fxRates = sqliteTable(
  "fx_rates",
  {
    currency: text("currency").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    rateTry: real("rate_try").notNull(),
    source: text("source", { enum: ["manual", "tcmb"] })
      .notNull()
      .default("manual"),
  },
  (t) => [primaryKey({ columns: [t.currency, t.date] })],
);

export const reminderLog = sqliteTable(
  "reminder_log",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    dueDate: text("due_date").notNull(), // YYYY-MM-DD
    daysBefore: integer("days_before").notNull(),
    sentAt: integer("sent_at").notNull(),
  },
  (t) => [
    index("reminder_unique_idx").on(t.subscriptionId, t.dueDate, t.daysBefore),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type UsageSnapshot = typeof usageSnapshots.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type FxRate = typeof fxRates.$inferSelect;
export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
