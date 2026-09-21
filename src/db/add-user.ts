/**
 * Yeni kullanıcı ve (gerekirse) yeni workspace açar.
 *   pnpm user:add <email> "<Ad Soyad>" "<Workspace adı>"
 * Workspace adı mevcutsa kullanıcı ona eklenir, yoksa yeni workspace açılır.
 * Parola rastgele üretilir ve ekrana bir kez yazılır.
 */
import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID, randomInt } from "node:crypto";
import path from "node:path";
import * as schema from "./schema";

async function main() {

  const [email, name, workspaceName] = process.argv.slice(2);

  if (!email || !name || !workspaceName) {
    console.error('Kullanım: pnpm user:add <email> "<Ad Soyad>" "<Workspace adı>"');
    process.exit(1);
  }

  const raw = process.env.DATABASE_URL ?? "file:./data/app.db";
  const file = raw.replace(/^file:/, "");
  const dbPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  const now = Math.floor(Date.now() / 1000);

  if (db.select().from(schema.users).where(eq(schema.users.email, email)).get()) {
    console.error(`Bu e-posta zaten kayıtlı: ${email}`);
    process.exit(1);
  }

  let workspace = await db
    .select()
    .from(schema.workspaces)
    .all()
    .find((w) => w.name.toLowerCase() === workspaceName.toLowerCase());

  if (!workspace) {
    workspace = { id: randomUUID(), name: workspaceName, createdAt: now };
    await db.insert(schema.workspaces).values(workspace).run();
    console.log(`Yeni workspace açıldı: ${workspaceName}`);
  }

  const words = ["kivi", "mercan", "yelken", "zeytin", "pusula", "safir", "kestane", "fener"];
  const password = `${words[randomInt(words.length)]}-${words[randomInt(words.length)]}-${randomInt(1000, 9999)}`;

  await db.insert(schema.users)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      email: email.toLowerCase(),
      name,
      passwordHash: bcrypt.hashSync(password, 10),
      createdAt: now,
    })
    .run();

  sqlite.close();

  console.log(`
  Kullanıcı oluşturuldu
    E-posta   : ${email.toLowerCase()}
    Parola    : ${password}
    Workspace : ${workspace.name}

  Bu parola bir daha gösterilmez — kullanıcıya güvenli bir kanaldan iletin.
  `);

}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
