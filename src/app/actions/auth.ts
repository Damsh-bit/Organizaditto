"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, expectedToken, safeEqual } from "@/lib/auth";

export async function login(_prev: { error?: string } | undefined, fd: FormData): Promise<{ error?: string }> {
  const password = String(fd.get("password") ?? "");
  const expectedPassword = process.env.APP_PASSWORD ?? "";
  const next = String(fd.get("next") ?? "/");
  if (!expectedPassword) redirect("/");
  if (!safeEqual(password, expectedPassword)) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Contraseña incorrecta" };
  }
  const token = await expectedToken();
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  redirect("/login");
}
