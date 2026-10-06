import type { Metadata } from "next";
import { CloudUpload, Database, Download, History, LogOut, Trash2, TriangleAlert } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, NativeSelect } from "@/components/form-fields";
import { PageHeader } from "@/components/page-header";
import { ImportBackup } from "@/components/settings/import-backup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addHabit,
  archiveHabit,
  backupNow,
  restoreAutoBackup,
  saveBaby,
  saveNutritionSettings,
  saveProfile,
  saveTrainingSettings,
  saveWorkSettings,
} from "@/app/actions/settings";
import { logout } from "@/app/actions/auth";
import { authEnabled } from "@/lib/auth";
import { dbInfo } from "@/db";
import { DEFAULT_MEAL_SPLIT, MEALS, RATE_SOURCES, WEEKDAYS } from "@/lib/constants";
import { fmtARS, fmtInt } from "@/lib/format";
import { ACTIVITY_LEVELS } from "@/lib/nutrition";
import { getBaby, getProfileContext } from "@/lib/data/settings";
import { getEffectiveRate } from "@/lib/data/rates";
import { getHabitsWeek } from "@/lib/data/habits";
import { fmtDateShort, relativeDayLabel, todayISO } from "@/lib/dates";
import { listAutoBackups } from "@/lib/server/auto-backup";

export const metadata: Metadata = { title: "Ajustes" };

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function AjustesPage() {
  const [ctx, baby, habits, autoBackups] = await Promise.all([getProfileContext(), getBaby(), getHabitsWeek(todayISO()), listAutoBackups()]);
  const s = ctx.settings;
  const t = ctx.targets;
  const { rate } = await getEffectiveRate(s);
  const split = s.mealSplit ?? DEFAULT_MEAL_SPLIT;
  const info = dbInfo();

  return (
    <div className="space-y-5">
      <PageHeader title="Ajustes" description="Tus datos, objetivos y preferencias. Todo se recalcula automáticamente." />

      <Section id="perfil" title="Perfil" description="Se usa para calcular tu gasto calórico (Mifflin-St Jeor).">
        <ActionForm action={saveProfile} success="Perfil guardado" className="grid gap-4 sm:grid-cols-3">
          <Field label="Nombre">
            <Input name="name" defaultValue={s.name ?? ""} />
          </Field>
          <Field label="Sexo biológico">
            <NativeSelect name="sex" defaultValue={s.sex ?? ""}>
              <option value="">—</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </NativeSelect>
          </Field>
          <Field label="Fecha de nacimiento">
            <Input type="date" name="birthDate" defaultValue={s.birthDate ?? ""} />
          </Field>
          <Field label="Altura (cm)">
            <Input name="heightCm" inputMode="decimal" defaultValue={s.heightCm ?? ""} />
          </Field>
          <Field label="Peso inicial (kg)" hint="El actual sale de tus pesajes">
            <Input name="startWeightKg" inputMode="decimal" defaultValue={s.startWeightKg ?? ""} />
          </Field>
          <Field label="Peso objetivo (kg)">
            <Input name="goalWeightKg" inputMode="decimal" defaultValue={s.goalWeightKg ?? ""} />
          </Field>
          <Field label="Actividad diaria (sin contar el gym)" className="sm:col-span-3">
            <NativeSelect name="activityLevel" defaultValue={s.activityLevel}>
              {Object.entries(ACTIVITY_LEVELS).map(([k, a]) => (
                <option key={k} value={k}>
                  {a.label} — {a.description}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="rounded-xl bg-muted/60 p-3 text-sm sm:col-span-2">
            Metabolismo basal <b>{fmtInt(t.bmr)} kcal</b> · Gasto diario estimado <b>{fmtInt(t.tdee)} kcal</b> · Objetivo <b>{fmtInt(t.target)} kcal</b>
            {ctx.weightKg && <> · calculado con {ctx.weightKg} kg</>}
          </div>
          <div className="flex items-end justify-end">
            <SubmitButton>Guardar perfil</SubmitButton>
          </div>
        </ActionForm>
      </Section>

      <Section id="nutricion" title="Objetivos de nutrición">
        <ActionForm action={saveNutritionSettings} className="grid gap-4 sm:grid-cols-3">
          <Field label="Déficit diario (kcal)" hint={`≈ ${(((s.deficitKcal || 0) * 7) / 7700).toFixed(2).replace(".", ",")} kg por semana`}>
            <Input name="deficitKcal" inputMode="numeric" defaultValue={s.deficitKcal} />
          </Field>
          <Field label="Calorías objetivo manual (opcional)" hint="Reemplaza el cálculo por fórmula. En Nutrición → Progreso te sugiero uno según tu gasto real">
            <Input name="targetKcalOverride" inputMode="numeric" defaultValue={s.targetKcalOverride ?? ""} placeholder={String(t.target)} />
          </Field>
          <Field label="Agua por día (ml)">
            <Input name="waterGoalMl" inputMode="numeric" defaultValue={s.waterGoalMl} />
          </Field>
          <Field label="Proteína (g por kg de peso)" hint="1,6 a 2,2 ayuda a cuidar el músculo en déficit">
            <Input name="proteinPerKg" inputMode="decimal" defaultValue={s.proteinPerKg} />
          </Field>
          <Field label="Grasas (% de las calorías)">
            <Input name="fatPct" inputMode="numeric" defaultValue={s.fatPct} />
          </Field>
          <Field label="% de calorías del ejercicio que se suman" hint="50% es un buen equilibrio (las estimaciones suelen exagerar)">
            <Input name="exerciseEatBackPct" inputMode="numeric" defaultValue={s.exerciseEatBackPct} />
          </Field>
          <div className="sm:col-span-3">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Reparto de calorías por comida (%) — se usa para generar el plan semanal</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {MEALS.map((m) => (
                <Field key={m.key} label={`${m.emoji} ${m.label}`}>
                  <Input name={`split_${m.key}`} inputMode="numeric" defaultValue={split[m.key] ? Math.round(split[m.key] * 100) : 0} />
                </Field>
              ))}
            </div>
          </div>
          <div className="text-sm text-muted-foreground sm:col-span-2">
            Hoy: {fmtInt(t.target)} kcal · Proteínas {t.protein} g · Grasas {t.fat} g · Carbohidratos {t.carbs} g
          </div>
          <div className="flex justify-end">
            <SubmitButton>Guardar</SubmitButton>
          </div>
        </ActionForm>
      </Section>

      <Section id="entrenamiento" title="Entrenamiento">
        <ActionForm action={saveTrainingSettings} className="grid gap-4 sm:grid-cols-3">
          <Field label="Días de gym por semana (objetivo)">
            <Input name="gymDaysPerWeek" inputMode="numeric" defaultValue={s.gymDaysPerWeek} />
          </Field>
          <Field label="Día de pesaje semanal">
            <NativeSelect name="weighInDay" defaultValue={s.weighInDay}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={(i + 1) % 7}>
                  {d}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Pasos por día (objetivo)" hint="8.000 a 10.000 suma mucho al déficit">
            <Input name="stepsGoal" inputMode="numeric" defaultValue={s.stepsGoal} />
          </Field>
          <Field label="Horas de sueño (objetivo)">
            <Input name="sleepGoalHours" inputMode="decimal" defaultValue={s.sleepGoalHours} />
          </Field>
          <div className="flex items-end justify-end">
            <SubmitButton>Guardar</SubmitButton>
          </div>
        </ActionForm>
      </Section>

      <Section id="trabajo" title="Trabajo y cotización" description={`Ahora: ${rate.label} (${rate.side}) ${fmtARS(rate.value, 2)} por dólar.`}>
        <ActionForm action={saveWorkSettings} className="grid gap-4 sm:grid-cols-3">
          <Field label="Tarifa por hora (USD)">
            <Input name="hourlyRateUsd" inputMode="decimal" defaultValue={s.hourlyRateUsd} />
          </Field>
          <Field label="Horas objetivo por semana">
            <Input name="workHoursGoalWeek" inputMode="decimal" defaultValue={s.workHoursGoalWeek} />
          </Field>
          <Field label="Días de trabajo por semana">
            <Input name="workDaysGoalWeek" inputMode="numeric" defaultValue={s.workDaysGoalWeek} />
          </Field>
          <Field label="Cotización para pasar a pesos">
            <NativeSelect name="rateSource" defaultValue={s.rateSource}>
              {Object.entries(RATE_SOURCES).map(([k, r]) => (
                <option key={k} value={k}>
                  {r.label} — {r.description}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Valor a usar" hint="Compra = lo que te pagan al vender tus dólares">
            <NativeSelect name="rateSide" defaultValue={s.rateSide}>
              <option value="compra">Compra</option>
              <option value="venta">Venta</option>
            </NativeSelect>
          </Field>
          <Field label="Cotización manual ($)" hint="Se usa si elegís “Manual” o si no hay conexión">
            <Input name="manualRate" inputMode="decimal" defaultValue={s.manualRate ?? ""} placeholder="1600" />
          </Field>
          <div className="flex justify-end sm:col-span-3">
            <SubmitButton>Guardar</SubmitButton>
          </div>
        </ActionForm>
      </Section>

      <Section id="bebe" title="Bebé">
        <ActionForm action={saveBaby} className="grid gap-4 sm:grid-cols-3">
          <Field label="Nombre">
            <Input name="name" defaultValue={baby?.name ?? ""} required />
          </Field>
          <Field label="Fecha de nacimiento">
            <Input type="date" name="birthDate" defaultValue={baby?.birthDate ?? ""} />
          </Field>
          <Field label="Sexo">
            <NativeSelect name="sex" defaultValue={baby?.sex ?? "female"}>
              <option value="female">Nena</option>
              <option value="male">Nene</option>
            </NativeSelect>
          </Field>
          <Field label="Empezó con sólidos el (opcional)">
            <Input type="date" name="solidsStartDate" defaultValue={baby?.solidsStartDate ?? ""} />
          </Field>
          <Field label="Notas (alergias, indicaciones del pediatra…)" className="sm:col-span-2">
            <Textarea name="notes" rows={2} defaultValue={baby?.notes ?? ""} />
          </Field>
          <div className="flex justify-end sm:col-span-3">
            <SubmitButton>Guardar</SubmitButton>
          </div>
        </ActionForm>
      </Section>

      <Section id="habitos" title="Hábitos" description="Aparecen en el Inicio para tildarlos cada día.">
        <div className="space-y-2">
          {habits.map((h) => (
            <div key={h.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <span className="text-lg">{h.emoji}</span>
              <span className="flex-1 text-sm">{h.name}</span>
              <span className="text-xs text-muted-foreground">{h.targetPerWeek}× por semana</span>
              <ActionButton
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                action={archiveHabit.bind(null, h.id)}
                confirm={`¿Quitar "${h.name}"?`}
                aria-label="Quitar"
              >
                <Trash2 className="size-3.5" />
              </ActionButton>
            </div>
          ))}
          <ActionForm action={addHabit} resetOnSuccess className="grid grid-cols-[4rem_1fr] gap-2 sm:grid-cols-[4rem_1fr_8rem_auto]">
            <Input name="emoji" placeholder="✅" maxLength={4} className="text-center" />
            <Input name="name" placeholder="Nuevo hábito (ej: leer 20 minutos)" required />
            <Input name="targetPerWeek" inputMode="numeric" placeholder="veces/sem" defaultValue={7} />
            <SubmitButton>Agregar</SubmitButton>
          </ActionForm>
        </div>
      </Section>

      <Section id="datos" title="Datos y backup">
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
            <Database className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              {info.driver === "neon" ? (
                <>Base de datos: <b>Neon (Postgres en la nube)</b>. Tus datos están disponibles desde cualquier dispositivo.</>
              ) : (
                <>
                  Base de datos: <b>local (PGlite)</b>
                  {info.dataDir && (
                    <>
                      {" "}en <code className="text-xs break-all">{info.dataDir}</code>
                    </>
                  )}
                  . Para usarla desde el celular, conectá una base Neon (ver README) y restaurá un backup.
                </>
              )}
            </div>
          </div>
          {autoBackups.dir && (
            <div className="space-y-2 rounded-xl border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <CloudUpload className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <div className="font-medium">Backup automático diario</div>
                    <div className="text-xs text-muted-foreground">
                      Se guarda solo la primera vez que abrís la app cada día en <code className="break-all">{autoBackups.dir}</code>
                      {autoBackups.dir.toLowerCase().includes("onedrive") && " (se sube a tu OneDrive)"}. Quedan los últimos 14 días y uno por mes.
                    </div>
                  </div>
                </div>
                <ActionButton size="sm" variant="outline" action={backupNow}>
                  Hacer backup ahora
                </ActionButton>
              </div>
              {autoBackups.error && (
                <p className="flex gap-2 rounded-lg bg-warning/10 p-2 text-xs">
                  <TriangleAlert className="size-3.5 shrink-0 text-warning" /> El último intento falló: {autoBackups.error}
                </p>
              )}
              {autoBackups.files.length > 0 ? (
                <ul className="divide-y rounded-lg border text-xs">
                  {autoBackups.files.slice(0, 6).map((f) => (
                    <li key={f.name} className="flex items-center gap-2 px-2.5 py-1.5">
                      <History className="size-3.5 text-muted-foreground" />
                      <span className="flex-1 first-letter:uppercase">{relativeDayLabel(f.date)}</span>
                      <span className="tabular text-muted-foreground">{Math.max(1, Math.round(f.bytes / 1024))} KB</span>
                      <ActionButton
                        size="xs"
                        variant="ghost"
                        action={restoreAutoBackup.bind(null, f.name)}
                        confirm={`Esto REEMPLAZA tus datos actuales por los del ${fmtDateShort(f.date)}. Antes se guarda una copia de lo actual. ¿Continuar?`}
                      >
                        Restaurar
                      </ActionButton>
                    </li>
                  ))}
                  {autoBackups.files.length > 6 && (
                    <li className="px-2.5 py-1.5 text-muted-foreground">y {autoBackups.files.length - 6} más en la carpeta</li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Todavía no hay backups automáticos.</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="/api/export">
                <Download className="size-4" /> Descargar backup (.json)
              </a>
            </Button>
            <ImportBackup />
          </div>
          {authEnabled() && (
            <form action={logout}>
              <Button type="submit" variant="ghost">
                <LogOut className="size-4" /> Cerrar sesión
              </Button>
            </form>
          )}
          <p className="text-xs text-muted-foreground">
            El backup incluye todo: perfil, recetas, registros, entrenamientos, horas, cobros y datos del bebé. Restaurar reemplaza los datos actuales.
          </p>
        </div>
      </Section>
    </div>
  );
}
