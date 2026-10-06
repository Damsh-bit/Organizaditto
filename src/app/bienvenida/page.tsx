import type { Metadata } from "next";
import { getBaby, getSettings } from "@/lib/data/settings";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bienvenida" };

export default async function BienvenidaPage() {
  const [s, baby] = await Promise.all([getSettings(), getBaby()]);
  return (
    <div className="min-h-dvh bg-gradient-to-b from-primary/10 via-background to-background px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg">
            O
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">¡Bienvenido/a a Organizaditto!</h1>
          <p className="mt-2 text-muted-foreground">
            Tu asistente personal de nutrición, entrenamiento, trabajo y bebé. Con estos datos calculo tus calorías
            para el déficit, tus macros y todo lo demás. Lo podés cambiar cuando quieras en Ajustes.
          </p>
        </div>
        <OnboardingForm
          defaults={{
            name: s.name ?? "",
            sex: s.sex ?? "",
            birthDate: s.birthDate ?? "",
            heightCm: s.heightCm?.toString() ?? "",
            weightKg: s.startWeightKg?.toString() ?? "",
            goalWeightKg: s.goalWeightKg?.toString() ?? "",
            activityLevel: s.activityLevel,
            deficitKcal: String(s.deficitKcal),
            hourlyRateUsd: String(s.hourlyRateUsd),
            babyName: baby?.name ?? "",
            babyBirthDate: baby?.birthDate ?? "",
            babySex: baby?.sex ?? "female",
          }}
        />
      </div>
    </div>
  );
}
