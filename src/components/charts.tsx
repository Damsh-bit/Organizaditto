"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { fmtDateShort } from "@/lib/dates";
import { fmtDec, fmtInt } from "@/lib/format";

type Point = { date: string; value: number | null };

function TooltipBox({ date, value, unit, digits, extra }: { date: string; value: number | null; unit: string; digits: number; extra?: string }) {
  return (
    <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="text-sm font-semibold tabular">
        {value == null ? "—" : `${digits ? fmtDec(value, digits) : fmtInt(value)} ${unit}`}
      </div>
      <div className="text-muted-foreground capitalize">{fmtDateShort(date)}</div>
      {extra && <div className="text-muted-foreground">{extra}</div>}
    </div>
  );
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

/** Columnas por día (una sola serie) con línea de referencia opcional (objetivo). */
export function DailyBarChart({
  data,
  target,
  targetLabel = "objetivo",
  color = "var(--primary)",
  unit,
  digits = 0,
  height = 220,
  label = "Valor",
}: {
  data: Point[];
  target?: number;
  targetLabel?: string;
  color?: string;
  unit: string;
  digits?: number;
  height?: number;
  label?: string;
}) {
  const config = { value: { label, color } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={axisTick}
          tickFormatter={(d: string) => d.slice(8, 10) + "/" + d.slice(5, 7)}
          minTickGap={12}
        />
        <YAxis tickLine={false} axisLine={false} tick={axisTick} width={44} tickFormatter={(v: number) => fmtInt(v)} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                date={payload[0].payload.date}
                value={payload[0].payload.value}
                unit={unit}
                digits={digits}
                extra={target ? `${targetLabel}: ${fmtInt(target)} ${unit}` : undefined}
              />
            ) : null
          }
        />
        {target != null && (
          <ReferenceLine
            y={target}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            label={{ value: targetLabel, position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 11 }}
          />
        )}
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  );
}

/** Línea de tendencia (una serie) con meta opcional. */
export function TrendLineChart({
  data,
  goal,
  goalLabel = "meta",
  color = "var(--primary)",
  unit,
  digits = 1,
  height = 240,
  label = "Valor",
}: {
  data: Point[];
  goal?: number | null;
  goalLabel?: string;
  color?: string;
  unit: string;
  digits?: number;
  height?: number;
  label?: string;
}) {
  const config = { value: { label, color } } satisfies ChartConfig;
  const values = data.map((d) => d.value).filter((v): v is number => v != null);
  if (goal != null) values.push(goal);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const pad = Math.max(0.5, (max - min) * 0.15);
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <LineChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={axisTick}
          tickFormatter={(d: string) => d.slice(8, 10) + "/" + d.slice(5, 7)}
          minTickGap={16}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          width={44}
          domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
          tickFormatter={(v: number) => fmtDec(v, 0)}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox date={payload[0].payload.date} value={payload[0].payload.value} unit={unit} digits={digits} />
            ) : null
          }
        />
        {goal != null && (
          <ReferenceLine
            y={goal}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            label={{ value: goalLabel, position: "insideBottomRight", fill: "var(--muted-foreground)", fontSize: 11 }}
          />
        )}
        <Line
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          connectNulls
          dot={{ r: 4, fill: "var(--color-value)", stroke: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
