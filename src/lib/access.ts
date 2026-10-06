/**
 * Contraseña de acceso configurada desde Ajustes (uso local): se guarda hasheada en
 * ~/.organizaditto/access.json, fuera de la base, para que el proxy la lea sin abrir la DB.
 * En Vercel no hay disco persistente: ahí se usa la variable APP_PASSWORD.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type AccessFile = { salt: string; hash: string; secret: string; updatedAt: string };

export function accessFilePath() {
  return process.env.ACCESS_FILE || path.join(os.homedir(), ".organizaditto", "access.json");
}

let cache: { mtimeMs: number; data: AccessFile | null } | null = null;

function readAccess(): AccessFile | null {
  if (process.env.VERCEL) return null;
  const file = accessFilePath();
  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(file).mtimeMs;
  } catch {
    cache = null;
    return null;
  }
  if (cache && cache.mtimeMs === mtimeMs) return cache.data;
  let data: AccessFile | null = null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (parsed?.salt && parsed?.hash && parsed?.secret) data = parsed;
  } catch {
    data = null;
  }
  cache = { mtimeMs, data };
  return data;
}

const hashPassword = (password: string, salt: string) => crypto.scryptSync(password, salt, 32).toString("hex");

export function hasAccessPassword() {
  return readAccess() != null;
}

export function setAccessPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  // Un secreto nuevo invalida las sesiones abiertas con la contraseña anterior.
  const data: AccessFile = { salt, hash: hashPassword(password, salt), secret: crypto.randomBytes(32).toString("hex"), updatedAt: new Date().toISOString() };
  const file = accessFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data), { mode: 0o600 });
  cache = null;
}

export function clearAccessPassword() {
  fs.rmSync(accessFilePath(), { force: true });
  cache = null;
}

export function verifyAccessPassword(password: string) {
  const data = readAccess();
  if (!data) return false;
  const a = Buffer.from(hashPassword(password, data.salt), "hex");
  const b = Buffer.from(data.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Valor de la cookie de sesión válido para la contraseña actual. */
export function accessToken(): string | null {
  const data = readAccess();
  if (!data) return null;
  return crypto.createHmac("sha256", data.secret).update("organizaditto-access").digest("hex");
}
