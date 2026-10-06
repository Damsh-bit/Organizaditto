import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, expectedToken, safeEqual } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const expected = await expectedToken();
  if (!expected) return NextResponse.next(); // sin contraseña: app abierta (solo escucha en esta PC)

  const token = request.cookies.get(AUTH_COOKIE)?.value ?? "";
  if (token && safeEqual(token, expected)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|login|favicon.ico|icon|apple-icon|manifest.webmanifest|icons/).*)"],
};
