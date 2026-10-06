"use client";

import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { fmtDateShort } from "@/lib/dates";
import { fmtDec } from "@/lib/format";
import {
  GROWTH_INDICATORS,
  assess,
  fmtPercentile,
  lmsAt,
  percentileCurves,
  valueAtZ,
  PERCENTILE_LINES,
  type GrowthIndicator,
  type GrowthSex,
} from "@/lib/growth";
import { cn } from "@/lib/utils";

export type GrowthPoint = { date: string; months: number; weightKg: number | null; lengthCm: number | null; headCm: number | null };

const FIELD: Record<GrowthIndicator, "weightKg" | "lengthCm" | "headCm"> = { weight: "weightKg", length: "lengthCm", head: "headCm" };

type Row = {
  months: number;
  outer: [number, number];
  inner: [number, number];
  p50: number;
  baby?: number;
  date?: string;
  pct?: number;
};

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

/** Curvas de la OMS (P3–P97, P15–P85 y mediana) con las mediciones del bebé encima. */
export function GrowthChart({ points, sex, ageMonths }: { points: GrowthPoint[]; sex: GrowthSex; ageMonths: number }) {
  const available = (Object.keys(FIELD) as GrowthIndicator[]).filter((k) => points.some((p) => p[FIELD[k]] != null));
  const [indicator, setIndicator] = useState<GrowthIndicator>(available[0] ?? "weight");
  const meta = GROWTH_INDICATORS[indicator];
  const field = FIELD[indicator];

  const maxMonths = Math.min(24, Math.max(6, Math.ceil(ageMonths + 2)));
  const rows: Row[] = percentileCurves(indicator, sex, maxMonths).map((c) => ({
    months: c.months,
    outer: [c.p3, c.p97],
    inner: [c.p15, c.p85],
    p50: c.p50,
  }));
  for (const p of points) {
    const v = p[field];
    const lms = lmsAt(indicator, sex, p.months);
    if (v == null || !lms || p.months > maxMonths) continue;
    const [p3, p15, p50, p85, p97] = PERCENTILE_LINES.map((l) => valueAtZ(l.z, lms));
    rows.push({ months: p.months, outer: [p3, p97], inner: [p15, p85], p50, baby: v, date: p.date, pct: assess(indicator, sex, p.months, v)?.percentile });
  }
  rows.sort((a, b) => a.months - b.months);

  const config = {
    baby: { label: "Tu bebé", color: "var(--baby)" },
    p50: { label: "Mediana", color: "var(--muted-foreground)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(FIELD) as GrowthIndicator[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setIndicator(k)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              k === indicator ? "border-baby bg-baby/10 text-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {GROWTH_INDICATORS[k].label}
          </button>
        ))}
      </div>

      <ChartContainer config={config} className="w-full" style={{ height: 280 }}>
        <ComposedChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="months"
            type="number"
            domain={[0, maxMonths]}
            ticks={Array.from({ length: maxMonths + 1 }, (_, i) => i).filter((m) => maxMonths <= 12 || m % 2 === 0)}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={axisTick}
            tickFormatter={(m: number) => `${m}m`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            width={40}
            domain={[(min: number) => Math.floor(min), (max: number) => Math.ceil(max)]}
            allowDecimals={false}
            tickFormatter={(v: number) => fmtDec(v, 0)}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const row = active && payload?.length ? (payload[0].payload as Row) : null;
              if (!row) return null;
              return (
                <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                  {row.baby != null ? (
                    <>
                      <div className="text-sm font-semibold tabular">
                        {fmtDec(row.baby, meta.digits)} {meta.unit}
                      </div>
                      <div className="text-muted-foreground">
                        {fmtDateShort(row.date!)} · {fmtDec(row.months, 1)} meses
                      </div>
                      {row.pct != null && <div>Percentil {fmtPercentile(row.pct)}</div>}
                    </>
                  ) : (
                    <>
                      <div className="font-medium">{fmtDec(row.months, 1)} meses</div>
                      <div className="text-muted-foreground tabular">
                        Mediana {fmtDec(row.p50, meta.digits)} {meta.unit}
                      </div>
                      <div className="text-muted-foreground tabular">
                        Normal (P3–P97): {fmtDec(row.outer[0], 1)} a {fmtDec(row.outer[1], 1)}
                      </div>
                    </>
                  )}
                </div>
              );
            }}
          />
          <Area dataKey="outer" stroke="none" fill="var(--baby)" fillOpacity={0.08} isAnimationActive={false} activeDot={false} />
          <Area dataKey="inner" stroke="none" fill="var(--baby)" fillOpacity={0.14} isAnimationActive={false} activeDot={false} />
          <Line dataKey="p50" stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} />
          <Line
            dataKey="baby"
            stroke="var(--color-baby)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            connectNulls
            dot={{ r: 4, fill: "var(--color-baby)", stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ChartContainer>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-baby" /> Tu bebé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-muted-foreground" /> Mediana (P50)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-baby/25" /> P15 a P85
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-baby/10" /> P3 a P97
        </span>
      </div>
    </div>
  );
}
