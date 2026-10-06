"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { clearAccessPassword, setAccessPassword } from "@/lib/access";
import { AUTH_COOKIE, authEnabled, checkPassword, expectedToken } from "@/lib/auth";

/** Cookie `secure` solo bajo HTTPS: por Wi-Fi la app se sirve por http y el navegador la descartaría. */
async function setSessionCookie(token: string) {
  const proto = (await headers()).get("x-forwarded-proto");
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: proto === "https",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function login(_prev: { error?: string } | undefined, fd: FormData): Promise<{ error?: string }> {
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "/");
  if (!authEnabled()) redirect("/");
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Contraseña incorrecta" };
  }
  await setSessionCookie((await expectedToken())!);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  redirect("/login");
}

/** Define (o cambia) la contraseña local. Este navegador queda con la sesión abierta. */
export async function setLocalPassword(fd: FormData): Promise<ActionResult> {
  if (process.env.APP_PASSWORD) return fail("La contraseña está definida con la variable APP_PASSWORD");
  if (process.env.VERCEL) return fail("En Vercel la contraseña se define con la variable APP_PASSWORD");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 6) return fail("Usá al menos 6 caracteres");
  if (password !== confirm) return fail("Las contraseñas no coinciden");
  setAccessPassword(password);
  await setSessionCookie((await expectedToken())!);
  revalidatePath("/", "layout");
  return ok("Contraseña guardada");
}

export async function removeLocalPassword(): Promise<ActionResult> {
  if (process.env.APP_PASSWORD) return fail("La contraseña está definida con la variable APP_PASSWORD");
  clearAccessPassword();
  (await cookies()).delete(AUTH_COOKIE);
  revalidatePath("/", "layout");
  return ok("Contraseña eliminada");
}
