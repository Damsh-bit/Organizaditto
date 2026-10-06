import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { DailyBarChart } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState, Stat } from "@/components/stats";
import { PayoutDialog } from "@/components/work/work-client";
import { deletePayout } from "@/app/actions/work";
import { addMonthsISO, fmtDateShort, startOfMonthISO, todayISO } from "@/lib/dates";
import { fmtARS, fmtUSD } from "@/lib/format";
import { getSettings } from "@/lib/data/settings";
import { getEffectiveRate } from "@/lib/data/rates";
import { getBalance, getMonthlyEarnings, getPayouts } from "@/lib/data/work";

export const metadata: Metadata = { title: "Cobros" };

export default async function CobrosPage() {
  const s = await getSettings();
  const firstMonth = addMonthsISO(startOfMonthISO(todayISO()), -5);
  const [{ rate }, balance, list, monthly] = await Promise.all([getEffectiveRate(s), getBalance(), getPayouts(), getMonthlyEarnings(firstMonth)]);
  const byMonth = new Map(monthly.map((m) => [m.month, m]));
  const months = Array.from({ length: 6 }, (_, i) => addMonthsISO(firstMonth, i));
  const series = months.map((m) => ({ date: m, value: byMonth.get(m)?.usd ?? 0 }));
  return (
    <div className="space-y-5">
      <PageHeader
        title="Cobros y retiros"
        description="Registrá cada vez que cobrás o pasás dólares a pesos, para saber cuánto te falta cobrar y a qué cotización lo hiciste."
        actions={<PayoutDialog today={todayISO()} rate={rate.value} pendingUsd={Math.max(0, balance.pendingUsd)} />}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pendiente de cobrar" value={fmtUSD(balance.pendingUsd)} hint={`≈ ${fmtARS(balance.pendingUsd * rate.value)} hoy`} />
        <Stat label="Ganado" value={fmtUSD(balance.earnedUsd)} />
        <Stat label="Cobrado" value={fmtUSD(balance.paidUsd)} />
        <Stat label="Recibido en pesos" value={fmtARS(balance.paidArs)} hint={balance.paidUsd ? `promedio ${fmtARS(balance.paidArs / balance.paidUsd, 2)}/USD` : undefined} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ganancias por mes (USD)</CardTitle>
          <CardDescription>Últimos 6 meses, según las horas registradas.</CardDescription>
        </CardHeader>
        <CardContent>
          <DailyBarChart data={series} unit="USD" digits={2} period="month" color="var(--work)" label="Ganancias" height={200} />
        </CardContent>
      </Card>
      {list.length === 0 ? (
        <EmptyState emoji="💸" title="Todavía no registraste cobros" />
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  {fmtUSD(p.amountUsd)} → {fmtARS(p.amountArs)}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {fmtDateShort(p.date)} · {p.method}
                  {p.arsRate ? ` · @ ${fmtARS(p.arsRate, 2)}` : ""}
                  {p.notes ? ` · ${p.notes}` : ""}
                </div>
              </div>
              <ActionButton variant="ghost" size="icon-sm" className="text-muted-foreground" action={deletePayout.bind(null, p.id)} confirm="¿Eliminar este cobro?" aria-label="Eliminar">
                <Trash2 className="size-3.5" />
              </ActionButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
