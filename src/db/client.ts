import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { ensureSeed } from "./seed";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

type DbState = { promise?: Promise<DB>; driver?: "neon" | "pglite"; dataDir?: string };
const g = globalThis as unknown as { __organizaditto?: DbState };
const state: DbState = (g.__organizaditto ??= {});

/** Carpeta donde PGlite guarda la base local (fuera de OneDrive para evitar bloqueos de sync). */
function pgliteDir() {
  if (process.env.PGLITE_DIR) return process.env.PGLITE_DIR;
  if (process.env.VERCEL) return path.join(os.tmpdir(), "organizaditto-pgdata");
  return path.join(os.homedir(), ".organizaditto", "pgdata");
}

async function create(): Promise<DB> {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const url = process.env.DATABASE_URL;
  let db: DB;

  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    const ndb = drizzle({ client: neon(url), schema });
    await migrate(ndb, { migrationsFolder });
    db = ndb as unknown as DB;
    state.driver = "neon";
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const dir = pgliteDir();
    fs.mkdirSync(dir, { recursive: true });
    const client = await PGlite.create(dir);
    const pdb = drizzle({ client, schema });
    await migrate(pdb, { migrationsFolder });
    db = pdb as unknown as DB;
    state.driver = "pglite";
    state.dataDir = dir;
  }

  await ensureSeed(db);
  return db;
}

export function getDb(): Promise<DB> {
  if (!state.promise) {
    state.promise = create().catch((err) => {
      state.promise = undefined;
      throw err;
    });
  }
  return state.promise;
}

export function dbInfo() {
  return {
    driver: state.driver ?? (process.env.DATABASE_URL ? "neon" : "pglite"),
    dataDir: state.dataDir ?? null,
    ephemeral: !process.env.DATABASE_URL && Boolean(process.env.VERCEL),
  };
}

export { schema };
