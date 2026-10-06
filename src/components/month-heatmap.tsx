import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS_SHORT } from "@/lib/constants";
import { addMonthsISO, endOfMonthISO, fmtMonth, rangeISO, startOfMonthISO, weekdayMon } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Calendario mensual tipo habit tracker. Cada día se pinta con un solo tono
 * (más intenso = más valor). Los días con valor muestran un punto/realce.
 */
export function MonthHeatmap({
  month,
  values,
  max,
  color,
  today,
  linkTemplate,
  titles,
  monthHrefTemplate,
  goalLine,
}: {
  month: string;
  values: Record<string, number>;
  max?: number;
  color: string;
  today: string;
  /** Ruta con {date}, ej: "/entrenamiento/nuevo?fecha={date}" */
  linkTemplate?: string;
  titles?: Record<string, string>;
  /** Ruta con {month}, para navegar meses */
  monthHrefTemplate?: string;
  goalLine?: React.ReactNode;
}) {
  const first = startOfMonthISO(month);
  const days = rangeISO(first, endOfMonthISO(month));
  const offset = weekdayMon(first);
  const top = max ?? Math.max(1, ...Object.values(values));
  const level = (v: number) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / top) * 4)));
  const mix = ["", "30%", "50%", "75%", "100%"];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        {monthHrefTemplate ? (
          <Link
            href={monthHrefTemplate.replace("{month}", addMonthsISO(first, -1))}
            className="grid size-8 place-items-center rounded-lg hover:bg-muted"
            aria-label="Mes anterior"
            scroll={false}
          >
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span />
        )}
        <div className="text-sm font-semibold">{fmtMonth(first)}</div>
        {monthHrefTemplate ? (
          <Link
            href={monthHrefTemplate.replace("{month}", addMonthsISO(first, 1))}
            className="grid size-8 place-items-center rounded-lg hover:bg-muted"
            aria-label="Mes siguiente"
            scroll={false}
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="pb-1 text-[10px] font-medium text-muted-foreground uppercase">
            {d}
          </div>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {days.map((d) => {
          const v = values[d] ?? 0;
          const l = level(v);
          const future = d > today;
          const content = (
            <div
              title={titles?.[d]}
              className={cn(
                "relative grid aspect-square place-items-center rounded-lg text-xs font-medium transition-transform tabular",
                l === 0 && "bg-muted/60 text-muted-foreground",
                l >= 3 && "text-white",
                future && "opacity-40",
                d === today && "ring-2 ring-foreground/70 ring-offset-1 ring-offset-background",
                linkTemplate && !future && "hover:scale-105",
              )}
              style={l > 0 ? { backgroundColor: `color-mix(in oklch, ${color} ${mix[l]}, transparent)` } : undefined}
            >
              {Number(d.slice(8, 10))}
            </div>
          );
          return linkTemplate && !future ? (
            <Link key={d} href={linkTemplate.replace("{date}", d)} aria-label={titles?.[d] ?? d}>
              {content}
            </Link>
          ) : (
            <div key={d}>{content}</div>
          );
        })}
      </div>
      {goalLine && <div className="mt-3 text-xs text-muted-foreground">{goalLine}</div>}
    </div>
  );
}
