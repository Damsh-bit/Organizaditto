/**
 * Protección con contraseña. Dos fuentes, en este orden:
 * - APP_PASSWORD (variable de entorno; la forma de hacerlo al publicar en Vercel).
 * - La contraseña que se configura en Ajustes (uso local, para entrar desde el celular por Wi-Fi).
 * Sin ninguna de las dos, la app no pide nada (y solo escucha en esta PC, ver scripts/serve.mjs).
 */
import { accessToken, hasAccessPassword, verifyAccessPassword } from "./access";

export const AUTH_COOKIE = "org_auth";

export type AuthSource = "env" | "local" | null;

export function authSource(): AuthSource {
  if (process.env.APP_PASSWORD) return "env";
  if (hasAccessPassword()) return "local";
  return null;
}

export function authEnabled() {
  return authSource() != null;
}

/** Token esperado en la cookie; cambia si cambia la contraseña. */
export async function expectedToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  if (!password) return accessToken();
  const secret = process.env.AUTH_SECRET || password;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`organizaditto:${password}`));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function checkPassword(password: string) {
  const env = process.env.APP_PASSWORD;
  if (env) return safeEqual(password, env);
  return verifyAccessPassword(password);
}

/** Comparación en tiempo constante para strings. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
