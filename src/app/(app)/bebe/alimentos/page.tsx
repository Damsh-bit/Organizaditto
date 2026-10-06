import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { EmptyState } from "@/components/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCEPTANCE, ALLERGENS, FOOD_CATEGORIES, REACTIONS } from "@/lib/constants";
import { ALLERGEN_TIPS, ALLERGY_SIGNS, KEY_ALLERGENS } from "@/lib/baby-guide";
import { fmtDate, fmtDateShort } from "@/lib/dates";
import { fmtDec } from "@/lib/format";
import { getBabyContext, getExposureSummary, getFoodsToTry, worseReaction } from "@/lib/data/baby";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Alimentos del bebé" };

export default async function BabyFoodsPage() {
  const { baby, months } = await getBabyContext();
  if (!baby) redirect("/bebe");
  const [tried, toTry] = await Promise.all([getExposureSummary(baby.id), getFoodsToTry(baby.id, months ?? 6)]);
  const toTryByCat = new Map<string, typeof toTry>();
  for (const f of toTry) toTryByCat.set(f.category, [...(toTryByCat.get(f.category) ?? []), f]);

  return (
    <div className="space-y-6">
      <PageHeader title="Alimentos y alérgenos" description={`Qué probó ${baby.name}, cuántas veces, si le gustó y si tuvo alguna reacción.`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Alérgenos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {KEY_ALLERGENS.map((key) => {
              const ex = tried.filter((e) => e.allergen === key);
              const worst = ex.reduce((a, e) => worseReaction(a, e.worstReaction), "ninguna");
              const times = ex.reduce((a, e) => a + e.times, 0);
              return (
                <div key={key} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <span className="text-xl">{ALLERGENS[key]?.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{ALLERGENS[key]?.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {times === 0
                        ? "Todavía no lo probó"
                        : `Primera vez: ${fmtDate(ex[0].firstDate)} · ${times} ${times === 1 ? "vez" : "veces"} · ${ex.map((e) => e.name).join(", ")}`}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      times === 0
                        ? "bg-muted text-muted-foreground"
                        : worst === "ninguna"
                          ? "bg-success/15 text-success"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
                    )}
                  >
                    {times === 0 ? "pendiente" : worst === "ninguna" ? "tolerado" : `reacción ${worst}`}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Cómo introducirlos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-4 text-sm">
                {ALLERGEN_TIPS.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Señales de alergia</CardTitle>
              <CardDescription>Ante dificultad para respirar: 107 / 911.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-4 text-sm">
                {ALLERGY_SIGNS.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <section>
        <SectionTitle>Ya probó ({tried.length})</SectionTitle>
        {tried.length === 0 ? (
          <EmptyState emoji="🥄" title="Todavía no registraste alimentos" description="Cuando registres comidas, los ingredientes aparecen acá." />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Alimento</th>
                  <th className="px-3 py-2 font-medium">Primera vez</th>
                  <th className="px-3 py-2 text-right font-medium">Veces</th>
                  <th className="px-3 py-2 font-medium">Aceptación</th>
                  <th className="px-3 py-2 font-medium">Reacción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tried.map((e) => (
                  <tr key={e.foodId}>
                    <td className="px-3 py-1.5">
                      {e.name}
                      {e.allergen && <span className="ml-1 text-xs">{ALLERGENS[e.allergen]?.emoji}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground capitalize">{fmtDateShort(e.firstDate)}</td>
                    <td className="px-3 py-1.5 text-right tabular">{e.times}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {e.avgAcceptance ? `${ACCEPTANCE[Math.round(e.avgAcceptance)]} (${fmtDec(e.avgAcceptance, 1)})` : "—"}
                    </td>
                    <td className={`px-3 py-1.5 ${REACTIONS[e.worstReaction]?.color}`}>{REACTIONS[e.worstReaction]?.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Para probar ({toTry.length})</SectionTitle>
        <p className="mb-3 text-sm text-muted-foreground">
          Alimentos aptos para su edad que todavía no registraste. Algunos pueden necesitar varios intentos (8 a 15) hasta que los acepte.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[...toTryByCat.entries()].map(([cat, list]) => (
            <Card key={cat} size="sm">
              <CardHeader>
                <CardTitle>{FOOD_CATEGORIES[cat] ?? cat}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {list.map((f) => (
                  <span key={f.id} className={cn("rounded-full border px-2 py-0.5 text-xs", f.allergen && "border-amber-300 bg-amber-50 dark:bg-amber-950/40")}>
                    {f.name}
                    {(f.babyFromMonths ?? 6) > 6 && <span className="text-muted-foreground"> · {f.babyFromMonths} m</span>}
                  </span>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
