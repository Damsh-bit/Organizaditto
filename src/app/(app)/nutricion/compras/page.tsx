import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { NewShoppingListForm } from "@/components/nutrition/shopping-client";
import { EmptyState, ProgressBar } from "@/components/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addDaysISO, fmtDate, startOfWeekISO, todayISO } from "@/lib/dates";
import { fmtARS } from "@/lib/format";
import { listShoppingLists } from "@/lib/data/nutrition";

export const metadata: Metadata = { title: "Lista de compras" };

export default async function ComprasPage() {
  const lists = await listShoppingLists();
  const today = todayISO();
  const thisWeek = startOfWeekISO(today);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lista de compras"
        description="Se arma sola con las recetas de tu plan: suma todos los ingredientes, redondea a lo que se vende y separa por verdulería, carnicería y súper."
      />
      <Card>
        <CardHeader>
          <CardTitle>Nueva lista</CardTitle>
          <CardDescription>Primero planificá la semana en “Plan semanal”.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewShoppingListForm thisWeek={thisWeek} nextWeek={addDaysISO(thisWeek, 7)} today={today} />
        </CardContent>
      </Card>

      <section>
        <SectionTitle>Tus listas</SectionTitle>
        {lists.length === 0 ? (
          <EmptyState emoji="🛒" title="Todavía no generaste listas" />
        ) : (
          <div className="space-y-2">
            {lists.map((l) => (
              <Link key={l.id} href={`/nutricion/compras/${l.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-xl">{l.kind === "mensual" ? "📦" : "🛒"}</div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{l.name}</span>
                    {l.completedAt && <span className="rounded-full bg-success/15 px-2 text-[11px] text-success">terminada</span>}
                  </div>
                  <ProgressBar value={l.checked} max={Math.max(1, l.total)} barClassName="bg-nutri" height="h-1.5" />
                  <div className="text-xs text-muted-foreground">
                    {l.checked}/{l.total} ítems
                    {l.startDate && ` · ${fmtDate(l.startDate)} → ${fmtDate(l.endDate ?? l.startDate)}`}
                    {l.cost > 0 && ` · ≈ ${fmtARS(l.cost)}`}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
