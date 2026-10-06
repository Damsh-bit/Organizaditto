"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MEALS } from "@/lib/constants";
import { fmtInt } from "@/lib/format";
import { matches } from "@/lib/search";
import { cn } from "@/lib/utils";

export type RecipeCardData = {
  id: number;
  name: string;
  emoji: string | null;
  description: string | null;
  kcal: number;
  protein: number;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  mealTypes: string[];
  tags: string[];
  isFavorite: boolean;
  babyMinMonths?: number | null;
  babyTexture?: string | null;
};

export function RecipeBrowser({
  recipes,
  basePath,
  mode = "adult",
  babyMonths,
}: {
  recipes: RecipeCardData[];
  basePath: string;
  mode?: "adult" | "baby";
  babyMonths?: number | null;
}) {
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const [ageOnly, setAgeOnly] = useState(mode === "baby" && babyMonths != null && babyMonths >= 4);

  const tags = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of recipes) for (const t of r.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t]) => t);
  }, [recipes]);

  const filtered = recipes.filter(
    (r) =>
      matches(`${r.name} ${r.description ?? ""} ${r.tags.join(" ")}`, q) &&
      (!meal || r.mealTypes.includes(meal)) &&
      (!tag || r.tags.includes(tag)) &&
      (!favOnly || r.isFavorite) &&
      (!ageOnly || babyMonths == null || (r.babyMinMonths ?? 6) <= Math.max(6, babyMonths)),
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar recetas…" className="pl-8" />
      </div>
      <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <Chip active={favOnly} onClick={() => setFavOnly(!favOnly)}>
          <Star className="size-3" /> Favoritas
        </Chip>
        {mode === "baby" && babyMonths != null && (
          <Chip active={ageOnly} onClick={() => setAgeOnly(!ageOnly)}>
            Aptas para su edad
          </Chip>
        )}
        {MEALS.map((m) => (
          <Chip key={m.key} active={meal === m.key} onClick={() => setMeal(meal === m.key ? null : m.key)}>
            {m.emoji} {m.label}
          </Chip>
        ))}
      </div>
      {tags.length > 0 && (
        <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {tags.map((t) => (
            <Chip key={t} small active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              #{t}
            </Chip>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">{filtered.length} recetas</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={`${basePath}/${r.id}`}
            className="group flex gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-muted/30"
          >
            <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-3xl">{r.emoji ?? "🍽️"}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1">
                <div className="line-clamp-2 flex-1 text-sm leading-snug font-medium group-hover:underline">{r.name}</div>
                {r.isFavorite && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {mode === "adult" ? (
                  <>
                    <span className="font-medium text-foreground tabular">{fmtInt(r.kcal)} kcal</span>
                    <span>P {fmtInt(r.protein)} g</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-baby">desde {r.babyMinMonths ?? 6} m</span>
                    {r.babyTexture && <span>{r.babyTexture}</span>}
                  </>
                )}
                {(r.prepMinutes ?? 0) + (r.cookMinutes ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="size-3" />
                    {(r.prepMinutes ?? 0) + (r.cookMinutes ?? 0)}′
                  </span>
                )}
                {r.servings > 1 && <span>rinde {r.servings}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border px-3 font-medium whitespace-nowrap transition-colors",
        small ? "py-0.5 text-[11px]" : "py-1 text-xs",
        active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
