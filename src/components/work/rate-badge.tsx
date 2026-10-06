import { RefreshCw } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { refreshRates } from "@/app/actions/work";
import type { EffectiveRate } from "@/lib/data/rates";
import { fmtARS } from "@/lib/format";

function ago(d: Date | null) {
  if (!d) return "sin datos";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "recién";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

export function RateBadge({ rate }: { rate: EffectiveRate }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-1 pl-3 text-xs">
      <span className="size-2 rounded-full bg-work" aria-hidden />
      <span>
        <span className="font-medium">{rate.label}</span> ({rate.side}) <span className="font-semibold tabular">{fmtARS(rate.value, 2)}</span>
        <span className="text-muted-foreground"> · {ago(rate.fetchedAt)}</span>
        {rate.fallback && <span className="text-amber-600"> · respaldo</span>}
      </span>
      <ActionButton variant="ghost" size="icon-xs" action={refreshRates} aria-label="Actualizar cotización">
        <RefreshCw className="size-3" />
      </ActionButton>
    </div>
  );
}
