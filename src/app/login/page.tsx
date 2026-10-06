import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-b from-primary/10 to-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg">O</div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizaditto</h1>
          <p className="text-sm text-muted-foreground">App personal · ingresá tu contraseña</p>
        </div>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
