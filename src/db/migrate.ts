import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";

const raw = process.env.DATABASE_URL ?? "file:./data/app.db";
const file = raw.replace(/^file:/, "");
const dbPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
sqlite.close();

console.log(`Migration tamamlandı: ${dbPath}`);
