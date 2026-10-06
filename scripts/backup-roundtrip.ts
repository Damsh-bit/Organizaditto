// Prueba de backup: exporta, reimporta y verifica que los conteos coincidan y las secuencias sigan funcionando.
import os from "node:os";
import path from "node:path";
import { count } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { weightLogs, foods } from "../src/db/schema";
import { BACKUP_TABLES, exportAll, importAll } from "../src/lib/server/backup";

// Nunca tocar la base real: siempre una base PGlite temporal.
delete process.env.DATABASE_URL;
process.env.PGLITE_DIR = path.join(os.tmpdir(), "organizaditto-backup-test");

async function main() {
  const db = await getDb();
  await db.insert(weightLogs).values({ date: "2026-01-01", weightKg: 90 }).onConflictDoNothing();
  const dump = await exportAll(db);
  const json = JSON.parse(JSON.stringify(dump));
  const before = Object.fromEntries(Object.entries(dump.data).map(([k, v]) => [k, v.length]));
  const total = await importAll(db, json);
  const after: Record<string, number> = {};
  for (const [name, table] of BACKUP_TABLES) {
    const [r] = await db.select({ c: count() }).from(table);
    after[name] = r.c;
  }
  const diff = Object.keys(before).filter((k) => before[k] !== after[k]);
  console.log("filas importadas:", total, diff.length ? `DIFERENCIAS: ${diff}` : "conteos OK");
  const [f] = await db.insert(foods).values({ name: "Test post-import", kcal: 1 }).returning({ id: foods.id });
  console.log("nuevo id foods:", f.id, "(secuencia OK)");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
