"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, NativeSelect } from "@/components/form-fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { completeOnboarding } from "@/app/actions/settings";
import { ACTIVITY_LEVELS, computeTargets } from "@/lib/nutrition";
import { fmtInt } from "@/lib/format";
import { parseNum } from "@/lib/format";

type Defaults = Record<
  | "name"
  | "sex"
  | "birthDate"
  | "heightCm"
  | "weightKg"
  | "goalWeightKg"
  | "activityLevel"
  | "deficitKcal"
  | "hourlyRateUsd"
  | "babyName"
  | "babyBirthDate"
  | "babySex",
  string
>;

export function OnboardingForm({ defaults }: { defaults: Defaults }) {
  const router = useRouter();
  const [v, setV] = useState(defaults);
  const set = (k: keyof Defaults) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  const t = computeTargets(
    {
      sex: v.sex === "male" || v.sex === "female" ? v.sex : null,
      birthDate: v.birthDate || null,
      heightCm: parseNum(v.heightCm),
      activityLevel: v.activityLevel,
      deficitKcal: parseNum(v.deficitKcal) ?? 500,
      targetKcalOverride: null,
      proteinPerKg: 1.8,
      fatPct: 28,
    },
    parseNum(v.weightKg),
  );

  return (
    <ActionForm action={completeOnboarding} className="space-y-4" onDone={() => router.push("/")}>
      <Card>
        <CardHeader>
          <CardTitle>Tus datos</CardTitle>
          <CardDescription>Para calcular tu gasto calórico (fórmula de Mifflin-St Jeor).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="name">
            <Input id="name" name="name" value={v.name} onChange={set("name")} placeholder="¿Cómo te llamo?" />
          </Field>
          <Field label="Sexo biológico" htmlFor="sex" hint="Solo para la fórmula de calorías">
            <NativeSelect id="sex" name="sex" value={v.sex} onChange={set("sex")} required>
              <option value="">Elegí…</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </NativeSelect>
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="birthDate">
            <Input id="birthDate" name="birthDate" type="date" value={v.birthDate} onChange={set("birthDate")} required />
          </Field>
          <Field label="Altura (cm)" htmlFor="heightCm">
            <Input id="heightCm" name="heightCm" inputMode="decimal" value={v.heightCm} onChange={set("heightCm")} placeholder="175" required />
          </Field>
          <Field label="Peso actual (kg)" htmlFor="weightKg">
            <Input id="weightKg" name="weightKg" inputMode="decimal" value={v.weightKg} onChange={set("weightKg")} placeholder="85" required />
          </Field>
          <Field label="Peso objetivo (kg)" htmlFor="goalWeightKg">
            <Input id="goalWeightKg" name="goalWeightKg" inputMode="decimal" value={v.goalWeightKg} onChange={set("goalWeightKg")} placeholder="75" />
          </Field>
          <Field label="Actividad diaria (sin contar el gym)" htmlFor="activityLevel" className="sm:col-span-2">
            <NativeSelect id="activityLevel" name="activityLevel" value={v.activityLevel} onChange={set("activityLevel")}>
              {Object.entries(ACTIVITY_LEVELS).map(([k, a]) => (
                <option key={k} value={k}>
                  {a.label} — {a.description}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Déficit diario" htmlFor="deficitKcal" className="sm:col-span-2">
            <NativeSelect id="deficitKcal" name="deficitKcal" value={v.deficitKcal} onChange={set("deficitKcal")}>
              <option value="300">Suave · −300 kcal (≈ 0,3 kg/semana)</option>
              <option value="500">Recomendado · −500 kcal (≈ 0,5 kg/semana)</option>
              <option value="750">Agresivo · −750 kcal (≈ 0,7 kg/semana)</option>
            </NativeSelect>
          </Field>

          {t.ready && (
            <div className="rounded-xl bg-primary/10 p-4 sm:col-span-2">
              <div className="text-sm text-muted-foreground">Tu objetivo diario sería</div>
              <div className="text-3xl font-semibold tracking-tight text-primary">{fmtInt(t.target)} kcal</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Gasto estimado {fmtInt(t.tdee)} kcal · Proteína {t.protein} g · Grasas {t.fat} g · Carbohidratos {t.carbs} g
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trabajo</CardTitle>
          <CardDescription>Tu tarifa por hora; la conversión a pesos se hace con la cotización de Wallbit.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field label="Tarifa por hora (USD)" htmlFor="hourlyRateUsd">
            <Input id="hourlyRateUsd" name="hourlyRateUsd" inputMode="decimal" value={v.hourlyRateUsd} onChange={set("hourlyRateUsd")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tu bebé</CardTitle>
          <CardDescription>Para adaptar recetas y texturas a su edad. Podés dejarlo para después.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Nombre" htmlFor="babyName">
            <Input id="babyName" name="babyName" value={v.babyName} onChange={set("babyName")} />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="babyBirthDate">
            <Input id="babyBirthDate" name="babyBirthDate" type="date" value={v.babyBirthDate} onChange={set("babyBirthDate")} />
          </Field>
          <Field label="Sexo" htmlFor="babySex">
            <NativeSelect id="babySex" name="babySex" value={v.babySex} onChange={set("babySex")}>
              <option value="female">Nena</option>
              <option value="male">Nene</option>
            </NativeSelect>
          </Field>
        </CardContent>
      </Card>

      <SubmitButton size="lg" className="w-full">
        Empezar
      </SubmitButton>
    </ActionForm>
  );
}
