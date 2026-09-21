import { describe, expect, it, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as schema from "@/db/schema";

/**
 * Workspace izolasyonu: A workspace'indeki kullanıcı, B'nin verisine
 * hiçbir yoldan ulaşamamalı. Sorgu mantığı queries.ts ile birebir aynıdır.
 */
const DB = path.join("/tmp", `iso-${randomUUID()}.db`);
let db: ReturnType<typeof drizzle>;
let sqlite: Database.Database;
const A = "ws_a";
const B = "ws_b";
let subA = "";
let subB = "";

beforeAll(() => {
  sqlite = new Database(DB);
  sqlite.exec(fs.readFileSync("drizzle/0000_deep_leopardon.sql", "utf8").replace(/--> statement-breakpoint/g, ""));
  sqlite.exec(`
    CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL, name text NOT NULL, created_at integer NOT NULL);
    ALTER TABLE users ADD workspace_id text NOT NULL DEFAULT 'x';
    ALTER TABLE accounts ADD workspace_id text NOT NULL DEFAULT 'x';
  `);
  db = drizzle(sqlite, { schema });
  const now = Math.floor(Date.now() / 1000);

  for (const [id, name] of [[A, "Alfa"], [B, "Beta"]]) {
    db.insert(schema.workspaces).values({ id, name, createdAt: now }).run();
    const accId = randomUUID();
    db.insert(schema.accounts).values({
      id: accId, workspaceId: id, label: `${name}-hesap`,
      email: `${name}@x.com`, color: "#000000", note: null, archived: false,
    }).run();
    const subId = randomUUID();
    db.insert(schema.subscriptions).values({
      id: subId, accountId: accId, service: `${name} Claude`, plan: "Pro",
      category: "ai", amount: 20, currency: "USD", cycle: "monthly",
      anchorDate: "2026-09-01", autoRenew: true, seats: 1, url: null, note: null,
      status: "active", cancelledAt: null, createdAt: now, updatedAt: now,
    }).run();
    if (id === A) subA = subId; else subB = subId;
  }
});

afterAll(() => { sqlite.close(); fs.rmSync(DB, { force: true }); });

/** queries.ts'teki filtrenin aynısı. */
const viewsOf = (ws: string) =>
  db.select().from(schema.subscriptions)
    .innerJoin(schema.accounts, eq(schema.subscriptions.accountId, schema.accounts.id))
    .where(eq(schema.accounts.workspaceId, ws)).all();

/** actions'taki assertOwnsSubscription'ın aynısı. */
const owns = (id: string, ws: string) =>
  !!db.select({ id: schema.subscriptions.id }).from(schema.subscriptions)
    .innerJoin(schema.accounts, eq(schema.subscriptions.accountId, schema.accounts.id))
    .where(and(eq(schema.subscriptions.id, id), eq(schema.accounts.workspaceId, ws))).get();

describe("workspace izolasyonu", () => {
  it("her workspace yalnızca kendi aboneliğini görür", () => {
    const a = viewsOf(A), b = viewsOf(B);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0].subscriptions.service).toBe("Alfa Claude");
    expect(b[0].subscriptions.service).toBe("Beta Claude");
  });

  it("A, B'nin kaydını göremez", () => {
    expect(viewsOf(A).map((r) => r.subscriptions.id)).not.toContain(subB);
  });

  it("A, B'nin kaydına id ile de erişemez (düzenleme/silme reddedilir)", () => {
    expect(owns(subB, A)).toBe(false);
    expect(owns(subA, B)).toBe(false);
    expect(owns(subA, A)).toBe(true); // kendi kaydı geçer
  });

  it("hesap listesi de izole", () => {
    const accA = db.select().from(schema.accounts).where(eq(schema.accounts.workspaceId, A)).all();
    expect(accA).toHaveLength(1);
    expect(accA[0].label).toBe("Alfa-hesap");
  });

  it("export sorgusu başka workspace verisi sızdırmaz", () => {
    const ids = db.select().from(schema.accounts).where(eq(schema.accounts.workspaceId, A)).all().map((a) => a.id);
    const subs = db.select().from(schema.subscriptions).where(inArray(schema.subscriptions.accountId, ids)).all();
    expect(subs).toHaveLength(1);
    expect(subs[0].id).toBe(subA);
  });
});
