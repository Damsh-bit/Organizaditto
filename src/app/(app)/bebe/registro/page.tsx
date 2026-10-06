import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { BabyLogDialog } from "@/components/baby/baby-log-dialog";
import { PageHeader } from "@/components/page-header";
import { DateNav, EmptyState } from "@/components/stats";
import { deleteBabyLog } from "@/app/actions/baby";
import { ACCEPTANCE, MEAL_LABEL, REACTIONS } from "@/lib/constants";
import { addDaysISO, fmtDate, fmtDateShort } from "@/lib/dates";
import { getBabyContext, getBabyFoodOptions, getBabyLogs, getExposureSummary } from "@/lib/data/baby";
import { getRecipeOptions } from "@/lib/data/nutrition";

export const metadata: Metadata = { title: "Registro del bebé" };

const FACES = ["", "😖", "😕", "😐", "😊", "😍"];

export default async function BabyRegistroPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { baby, months, today } = await getBabyContext();
  if (!baby) redirect("/bebe");
  const offset = Math.max(0, Number(sp.semanas) || 0);
  const to = addDaysISO(today, -7 * offset);
  const from = addDaysISO(to, -13);
  const [logs, recipes, foods, exposures] = await Promise.all([
    getBabyLogs(baby.id, from, to),
    getRecipeOptions("baby"),
    getBabyFoodOptions(),
    getExposureSummary(baby.id),
  ]);
  const byDay = new Map<string, typeof logs>();
  for (const l of logs) byDay.set(l.date, [...(byDay.get(l.date) ?? []), l]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Registro de comidas"
        description={`Todo lo que comió ${baby.name}, con aceptación y reacciones.`}
        actions={<BabyLogDialog date={today} recipes={recipes} foods={foods} months={months} triedFoodIds={exposures.map((e) => e.foodId)} />}
      />
      <DateNav
        label={`Del ${fmtDate(from)} al ${fmtDate(to)}`}
        prevHref={`/bebe/registro?semanas=${offset + 2}`}
        nextHref={`/bebe/registro?semanas=${Math.max(0, offset - 2)}`}
        todayHref={offset > 0 ? "/bebe/registro" : null}
      />
      {logs.length === 0 ? (
        <EmptyState emoji="🍼" title="Sin registros en estas dos semanas" />
      ) : (
        [...byDay.entries()].map(([d, ls]) => (
          <div key={d} className="rounded-xl border bg-card">
            <div className="border-b px-3 py-2 text-sm font-medium capitalize">{fmtDateShort(d)}</div>
            <div className="divide-y">
              {ls.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="text-2xl">{l.acceptance ? FACES[l.acceptance] : (l.recipe?.emoji ?? "🍼")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{l.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {MEAL_LABEL[l.meal]}
                      {l.amount ? ` · ${l.amount}` : ""}
                      {l.acceptance ? ` · ${ACCEPTANCE[l.acceptance]}` : ""}
                    </div>
                    {l.reaction !== "ninguna" && (
                      <div className={`text-xs ${REACTIONS[l.reaction]?.color}`}>
                        Reacción {l.reaction}
                        {l.reactionNotes ? `: ${l.reactionNotes}` : ""}
                      </div>
                    )}
                  </div>
                  <ActionButton
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    action={deleteBabyLog.bind(null, l.id)}
                    confirm="¿Eliminar?"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-3.5" />
                  </ActionButton>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
