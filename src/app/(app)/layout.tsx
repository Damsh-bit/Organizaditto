import { AppShell } from "@/components/app-shell";
import { dbInfo } from "@/db";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const info = dbInfo();
  const banner = info.ephemeral ? (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      Estás usando una base temporal: conectá una base Neon (variable <code>DATABASE_URL</code>) para que tus datos no se pierdan.
    </div>
  ) : null;
  return <AppShell banner={banner}>{children}</AppShell>;
}
