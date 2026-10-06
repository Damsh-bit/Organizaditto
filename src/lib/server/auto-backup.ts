import "server-only";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { eq, sql } from "drizzle-orm";
import { getDb, type DB } from "@/db";
import { progressPhotos, settings } from "@/db/schema";
import { todayISO } from "@/lib/dates";
import { exportAll, importAll } from "./backup";

/**
 * Backup automático: una copia comprimida por día en una carpeta de OneDrive,
 * así los datos también quedan en la nube aunque la base viva en la PC.
 */
const FILE_RE = /^organizaditto-(\d{4}-\d{2}-\d{2})\.json\.gz$/;
/** Las fotos van aparte, en un solo archivo que se reescribe cuando cambian (si no, cada backup diario pesaría mucho). */
const PHOTOS_FILE = "organizaditto-fotos.json.gz";
const PHOTOS_SIG = ".organizaditto-fotos.sig";
const KEEP_DAILY = 14;
const KEEP_MONTHLY = 12;
const CHECK_EVERY_MS = 10 * 60_000;

type State = { lastCheck?: number; running?: Promise<void>; error?: string };
const g = globalThis as unknown as { __orgAutoBackup?: State };
const state: State = (g.__orgAutoBackup ??= {});

/** Carpeta de backups, o null si están desactivados (Vercel, base de prueba o AUTO_BACKUP=0). */
export function autoBackupDir(): string | null {
  if (process.env.AUTO_BACKUP === "0" || process.env.VERCEL) return null;
  if (process.env.BACKUP_DIR) return process.env.BACKUP_DIR;
  // Una base PGlite en otra carpeta (pruebas) no debe mezclarse con los backups reales.
  if (process.env.PGLITE_DIR) return null;
  const oneDrive = process.env.OneDrive || process.env.OneDriveConsumer;
  if (oneDrive) return path.join(oneDrive, "Organizaditto", "backups");
  return path.join(os.homedir(), ".organizaditto", "backups");
}

export type BackupFile = { name: string; date: string; bytes: number };

export async function listAutoBackups(): Promise<{ dir: string | null; files: BackupFile[]; error?: string }> {
  const dir = autoBackupDir();
  if (!dir) return { dir: null, files: [] };
  try {
    const names = (await fs.readdir(dir)).filter((n) => FILE_RE.test(n)).sort().reverse();
    const files = await Promise.all(
      names.map(async (name) => ({ name, date: name.match(FILE_RE)![1], bytes: (await fs.stat(path.join(dir, name))).size })),
    );
    return { dir, files, error: state.error };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { dir, files: [], error: state.error };
    return { dir, files: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/** Escribe el backup de hoy (lo reemplaza si ya existía). */
export async function writeAutoBackup(): Promise<BackupFile> {
  const dir = autoBackupDir();
  if (!dir) throw new Error("El backup automático está desactivado en este entorno");
  const db = await getDb();
  const data = await exportAll(db, { exclude: ["progress_photos"] });
  const gz = gzipSync(JSON.stringify(data));
  await fs.mkdir(dir, { recursive: true });
  const name = `organizaditto-${todayISO()}.json.gz`;
  await writeAtomic(dir, name, gz);
  await writePhotosIfChanged(db, dir);
  await prune(dir);
  state.error = undefined;
  return { name, date: todayISO(), bytes: gz.length };
}

async function writeAtomic(dir: string, name: string, content: Buffer | string) {
  const tmp = path.join(dir, `.${name}.tmp`);
  await fs.writeFile(tmp, content);
  await fs.rename(tmp, path.join(dir, name));
}

async function writePhotosIfChanged(db: DB, dir: string) {
  const [row] = await db
    .select({
      n: sql<number>`count(*)`.mapWith(Number),
      max: sql<number>`coalesce(max(${progressPhotos.id}), 0)`.mapWith(Number),
      sum: sql<number>`coalesce(sum(${progressPhotos.id}), 0)`.mapWith(Number),
    })
    .from(progressPhotos);
  const sig = `${row.n}-${row.max}-${row.sum}`;
  const prev = await fs.readFile(path.join(dir, PHOTOS_SIG), "utf8").catch(() => null);
  if (prev === sig || (row.n === 0 && prev == null)) return;
  const data = await exportAll(db, { only: ["progress_photos"] });
  await writeAtomic(dir, PHOTOS_FILE, gzipSync(JSON.stringify(data)));
  await writeAtomic(dir, PHOTOS_SIG, sig);
}

/** Si la base quedó sin fotos (por ejemplo, en una compu nueva), las recupera del archivo de fotos. */
export async function restorePhotosIfEmpty(db: DB) {
  const dir = autoBackupDir();
  if (!dir) return 0;
  const [row] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(progressPhotos);
  if (row.n > 0) return 0;
  const buf = await fs.readFile(path.join(dir, PHOTOS_FILE)).catch(() => null);
  if (!buf) return 0;
  return importAll(db, parseBackup(buf));
}

/** Deja los últimos 14 días y, de antes, el último de cada mes (hasta 12 meses). */
async function prune(dir: string) {
  const names = (await fs.readdir(dir)).filter((n) => FILE_RE.test(n)).sort().reverse();
  const keep = new Set(names.slice(0, KEEP_DAILY));
  const months = new Set<string>();
  for (const n of names.slice(KEEP_DAILY)) {
    const month = n.match(FILE_RE)![1].slice(0, 7);
    if (!months.has(month) && months.size < KEEP_MONTHLY) {
      months.add(month);
      keep.add(n);
    }
  }
  await Promise.all(names.filter((n) => !keep.has(n)).map((n) => fs.unlink(path.join(dir, n)).catch(() => {})));
}

/** Se llama al servir páginas: si hoy todavía no hay backup, lo hace (como mucho un chequeo cada 10 min). */
export async function maybeAutoBackup() {
  const dir = autoBackupDir();
  if (!dir || state.running) return;
  if (state.lastCheck && Date.now() - state.lastCheck < CHECK_EVERY_MS) return;
  state.lastCheck = Date.now();
  state.running = (async () => {
    try {
      const exists = await fs
        .access(path.join(dir, `organizaditto-${todayISO()}.json.gz`))
        .then(() => true)
        .catch(() => false);
      if (exists) return;
      const db = await getDb();
      const [s] = await db.select({ onboarded: settings.onboarded }).from(settings).where(eq(settings.id, 1));
      if (!s?.onboarded) return;
      await writeAutoBackup();
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
      console.error("[backup automático]", e);
    } finally {
      state.running = undefined;
    }
  })();
  await state.running;
}

/** Lee un backup automático por nombre (validado para no salir de la carpeta). */
export async function readAutoBackup(name: string): Promise<unknown> {
  const dir = autoBackupDir();
  if (!dir || !FILE_RE.test(name)) throw new Error("Backup inválido");
  return parseBackup(await fs.readFile(path.join(dir, name)));
}

/** Acepta un backup .json o .json.gz. */
export function parseBackup(buf: Buffer): unknown {
  const raw = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
  return JSON.parse(raw.toString("utf8"));
}
