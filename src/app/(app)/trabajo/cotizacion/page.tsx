import type { Metadata } from "next";
import Link from "next/link";
import { TrendLineChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { RateBadge } from "@/components/work/rate-badge";
import { Converter } from "@/components/work/work-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addDaysISO, todayISO } from "@/lib/dates";
import { fmtARS, fmtUSD } from "@/lib/format";
import { getSettings } from "@/lib/data/settings";
import { getEffectiveRate, getRateHistory, getStoredRateHistory } from "@/lib/data/rates";

export const metadata: Metadata = { title: "Cotización del dólar" };

const ORDER: [string, string][] = [
  ["wallbit", "Wallbit"],
  ["blue", "Dólar blue"],
  ["cripto", "Dólar cripto"],
  ["bolsa", "Dólar MEP"],
  ["ccl", "Contado con liqui"],
  ["oficial", "Dólar oficial"],
  ["tarjeta", "Dólar tarjeta"],
];

export default async function CotizacionPage() {
  const s = await getSettings();
  const today = todayISO();
  const [{ rate, quotes }, blueHist, wallbitHist] = await Promise.all([
    getEffectiveRate(s),
    getRateHistory("blue", 90),
    getStoredRateHistory("wallbit", addDaysISO(today, -90)),
  ]);
  const converterRates = ORDER.filter(([k]) => quotes[k]?.buy).map(([k, label]) => ({ label: `${label} (compra)`, value: quotes[k].buy! }));
  if (!converterRates.length) converterRates.push({ label: rate.label, value: rate.value });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cotización del dólar"
        description="La app usa la cotización elegida en Ajustes para pasar tus dólares a pesos. Se actualiza sola cada 15 minutos."
        actions={<RateBadge rate={rate} />}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cotizaciones ahora</CardTitle>
            <CardDescription>
              “Compra” = lo que te pagan por cada dólar que vendés. Fuente: ComparaDólar (Wallbit) y DolarAPI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Tipo</th>
                  <th className="py-2 text-right font-medium">Compra</th>
                  <th className="py-2 text-right font-medium">Venta</th>
                </tr>
              </thead>
              <tbody className="divide-y tabular">
                {ORDER.filter(([k]) => quotes[k]).map(([k, label]) => (
                  <tr key={k} className={k === rate.source ? "font-medium" : ""}>
                    <td className="py-2">
                      {label}
                      {k === rate.source && <span className="ml-2 rounded-full bg-work/15 px-2 text-[11px] text-work">en uso</span>}
                    </td>
                    <td className="py-2 text-right">{fmtARS(quotes[k].buy, 2)}</td>
                    <td className="py-2 text-right text-muted-foreground">{fmtARS(quotes[k].sell, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Cambiá la cotización que se usa (Wallbit, blue, MEP o un valor manual) en{" "}
              <Link href="/ajustes#trabajo" className="underline">
                Ajustes
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversor</CardTitle>
            <CardDescription>Tu hora vale {fmtUSD(s.hourlyRateUsd)} = {fmtARS(s.hourlyRateUsd * rate.value)} hoy.</CardDescription>
          </CardHeader>
          <CardContent>
            <Converter rates={converterRates} />
          </CardContent>
        </Card>
      </div>

      {blueHist.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Dólar blue · últimos 90 días (compra)</CardTitle>
            <CardDescription>Fuente: ArgentinaDatos.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendLineChart data={blueHist.map((h) => ({ date: h.fecha, value: h.compra }))} unit="$" digits={0} color="var(--work)" label="Blue compra" />
          </CardContent>
        </Card>
      )}
      {wallbitHist.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Wallbit · historial guardado (compra)</CardTitle>
            <CardDescription>Se va armando con las cotizaciones que la app consulta cada día.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendLineChart data={wallbitHist.map((h) => ({ date: h.date, value: h.buy }))} unit="$" digits={2} color="var(--work)" label="Wallbit compra" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
