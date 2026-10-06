import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getProfileContext } from "@/lib/data/settings";
import { fmtInt } from "@/lib/format";

export default async function HomePage() {
  const { settings, targets } = await getProfileContext();
  if (!settings.onboarded) redirect("/bienvenida");
  return (
    <div>
      <PageHeader title={`Hola${settings.name ? `, ${settings.name}` : ""}`} description="Resumen del día" />
      <p>Objetivo: {fmtInt(targets.target)} kcal</p>
    </div>
  );
}
