/**
 * Protección opcional con contraseña. Se activa definiendo APP_PASSWORD
 * (por ejemplo al publicar la app en Vercel). En local, sin la variable, no pide nada.
 */

export const AUTH_COOKIE = "org_auth";

export function authEnabled() {
  return Boolean(process.env.APP_PASSWORD);
}

/** Token derivado de la contraseña (HMAC-SHA256); cambia si cambia la contraseña. */
export async function expectedToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  const secret = process.env.AUTH_SECRET || password;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`organizaditto:${password}`));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparación en tiempo constante para strings. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
