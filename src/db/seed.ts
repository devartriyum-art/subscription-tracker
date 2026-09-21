import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

async function main() {

  const raw = process.env.DATABASE_URL ?? "file:./data/app.db";
  const file = raw.replace(/^file:/, "");
  const dbPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  const now = Math.floor(Date.now() / 1000);
  // Kullanıcılar artık `pnpm user:add` ile tek tek açılır (her birine ayrı parola).
  // Seed yalnızca workspace + hesapları hazırlar; kullanıcı yoksa rastgele parola üretir.
  const password =
    process.env.SEED_PASSWORD || randomUUID().slice(0, 12);
  const passwordHash = bcrypt.hashSync(password, 10);
  let createdUser = false;

  const ACCOUNTS = [
    { label: "design", email: "design@artriyum.com", color: "#E0651A" },
    { label: "dev", email: "dev@artriyum.com", color: "#2F6FED" },
    { label: "dev2", email: "dev2.artriyum@gmail.com", color: "#1F9E63" },
    { label: "management", email: "management@artriyum.com", color: "#8A4FD3" },
  ];

  const USERS = [
    { name: "Design", email: "design@artriyum.com" },
    { name: "Dev", email: "dev@artriyum.com" },
    { name: "Dev 2", email: "dev2.artriyum@gmail.com" },
    { name: "Yönetim", email: "management@artriyum.com" },
  ];

  // Varsayılan workspace — tüm seed verisi buna bağlanır.
  const WORKSPACE_ID = "ws_artriyum";
  if (!(await db.select()).from(schema.workspaces).all().some((w) => w.id === WORKSPACE_ID)) {
    await db.insert(schema.workspaces)
      .values({ id: WORKSPACE_ID, name: "artriyum", createdAt: now })
      .run();
  }

  const existingAccounts = await db.select().from(schema.accounts).all();
  const existingUsers = await db.select().from(schema.users).all();

  const accountIds = new Map<string, string>();
  for (const account of ACCOUNTS) {
    const found = existingAccounts.find((a) => a.label === account.label);
    if (found) {
      accountIds.set(account.label, found.id);
      continue;
    }
    const id = randomUUID();
    await db.insert(schema.accounts)
      .values({ ...account, id, workspaceId: WORKSPACE_ID, note: null, archived: false })
      .run();
    accountIds.set(account.label, id);
  }

  for (const user of USERS) {
    if (existingUsers.some((u) => u.email === user.email)) continue;
    createdUser = true;
    await db.insert(schema.users)
      .values({
        id: randomUUID(),
        workspaceId: WORKSPACE_ID,
        email: user.email,
        name: user.name,
        passwordHash,
        createdAt: now,
      })
      .run();
  }

  // Örnek abonelikler yalnızca tablo boşsa eklenir — mevcut veri ezilmez.
  const subscriptionCount = await (await db.select().from(schema.subscriptions).all()).length;

  if (subscriptionCount === 0) {
    const samples = [
      {
        account: "dev",
        service: "Claude",
        plan: "Max 20x",
        category: "ai" as const,
        amount: 200,
        currency: "USD" as const,
        cycle: "monthly" as const,
        anchorDate: "2026-09-18",
        seats: 1,
      },
      {
        account: "dev2",
        service: "Claude",
        plan: "Pro",
        category: "ai" as const,
        amount: 20,
        currency: "USD" as const,
        cycle: "monthly" as const,
        anchorDate: "2026-09-22",
        seats: 1,
      },
      {
        account: "management",
        service: "ChatGPT",
        plan: "Plus",
        category: "ai" as const,
        amount: 20,
        currency: "USD" as const,
        cycle: "monthly" as const,
        anchorDate: "2026-10-03",
        seats: 1,
      },
      {
        account: "design",
        service: "Figma",
        plan: "Professional",
        category: "design" as const,
        amount: 144,
        currency: "USD" as const,
        cycle: "yearly" as const,
        anchorDate: "2026-01-31",
        seats: 2,
      },
      {
        account: "design",
        service: "Adobe Creative Cloud",
        plan: "Tüm Uygulamalar",
        category: "design" as const,
        amount: 2500,
        currency: "TRY" as const,
        cycle: "monthly" as const,
        anchorDate: "2026-09-16",
        seats: 1,
      },
      {
        account: "dev",
        service: "GitHub",
        plan: "Team",
        category: "dev" as const,
        amount: 4,
        currency: "USD" as const,
        cycle: "monthly" as const,
        anchorDate: "2026-09-28",
        seats: 4,
      },
      {
        account: "management",
        service: "Google Workspace",
        plan: "Business Standard",
        category: "office" as const,
        amount: 12,
        currency: "EUR" as const,
        cycle: "monthly" as const,
        anchorDate: "2026-10-12",
        seats: 4,
      },
    ];

    for (const sample of samples) {
      const accountId = accountIds.get(sample.account);
      if (!accountId) continue;
      await db.insert(schema.subscriptions)
        .values({
          id: randomUUID(),
          accountId,
          service: sample.service,
          plan: sample.plan,
          category: sample.category,
          amount: sample.amount,
          currency: sample.currency,
          cycle: sample.cycle,
          anchorDate: sample.anchorDate,
          autoRenew: true,
          seats: sample.seats,
          url: null,
          note: null,
          status: "active",
          cancelledAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
    console.log(`${samples.length} örnek abonelik eklendi.`);
  }

  sqlite.close();

  console.log(`Seed tamam: ${ACCOUNTS.length} hesap, ${USERS.length} kullanıcı.`);
  if (createdUser) {
    console.log(
      `Yeni kullanıcıların parolası: ${password}\n` +
        `Üretim için 'pnpm user:add <email> "<Ad>" "<Workspace>"' kullanın.`,
    );
  }

}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
