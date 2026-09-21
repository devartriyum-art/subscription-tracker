import "server-only";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { createClient } from "@libsql/client";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Sürücü ortama göre seçilir:
 *  - TURSO_DATABASE_URL varsa → libSQL (Vercel/bulut, 7/24)
 *  - yoksa                    → better-sqlite3 (yerel dosya)
 * Drizzle şeması her iki durumda da aynıdır.
 */
function resolveDbPath() {
  const raw = process.env.DATABASE_URL ?? "file:./data/app.db";
  const file = raw.replace(/^file:/, "");
  // SQLite yolu çalışma anında çözülür; Turbopack tüm projeyi izlemesin.
  return path.isAbsolute(file)
    ? file
    : path.join(/* turbopackIgnore: true */ process.cwd(), file);
}

function buildLocal() {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const conn = new Database(dbPath);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  return drizzleSqlite(conn, { schema });
}

function buildTurso(url: string) {
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return drizzleLibsql(client, { schema });
}

const globalForDb = globalThis as unknown as {
  __db?: ReturnType<typeof buildLocal>;
};

const tursoUrl = process.env.TURSO_DATABASE_URL;

// Not: libSQL istemcisi de senkron .all()/.get() API'sini desteklemez;
// bu yüzden bulut dağıtımında sorgular async'e çevrilmelidir (bkz. PLAN-v2 adım 7).
export const db =
  globalForDb.__db ??
  (tursoUrl
    ? (buildTurso(tursoUrl) as unknown as ReturnType<typeof buildLocal>)
    : buildLocal());

if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

export { schema };
