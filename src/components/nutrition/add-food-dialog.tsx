"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Loader2, Plus, Search, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/form-fields";
import { addFoodLog } from "@/app/actions/nutrition";
import { MEALS, type MealKey } from "@/lib/constants";
import { FOOD_CATEGORIES } from "@/lib/constants";
import { fmtDec, fmtInt, parseNum } from "@/lib/format";
import { macrosFor, scaleMacros } from "@/lib/nutrition";
import { matches } from "@/lib/search";
import type { FoodOption, RecipeOption } from "@/lib/data/nutrition";
import { cn } from "@/lib/utils";

export type FrequentItem = {
  foodId: number | null;
  recipeId: number | null;
  name: string;
  grams: number | null;
  servings: number | null;
  kcal: number;
};

type Selected = { type: "food"; food: FoodOption } | { type: "recipe"; recipe: RecipeOption } | null;

export function AddFoodDialog({
  date,
  meal,
  foods,
  recipes,
  frequent = [],
  trigger,
}: {
  date: string;
  meal: MealKey;
  foods: FoodOption[];
  recipes: RecipeOption[];
  frequent?: FrequentItem[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"buscar" | "rapido">("buscar");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Selected>(null);
  const [mealSel, setMealSel] = useState<MealKey>(meal);
  const [amount, setAmount] = useState("100");
  const [unitMode, setUnitMode] = useState<"g" | "unit">("g");
  const [servings, setServings] = useState("1");
  const [quick, setQuick] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  const [pending, start] = useTransition();

  const reset = () => {
    setSelected(null);
    setQuery("");
    setTab("buscar");
    setQuick({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  };

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const r = recipes.filter((x) => matches(x.name, query)).slice(0, 15);
    const f = foods.filter((x) => matches(`${x.name} ${FOOD_CATEGORIES[x.category] ?? ""}`, query)).slice(0, 30);
    return { recipes: r, foods: f };
  }, [query, foods, recipes]);

  const selectFood = (food: FoodOption, grams?: number | null) => {
    setSelected({ type: "food", food });
    if (grams) {
      setUnitMode("g");
      setAmount(String(Math.round(grams)));
    } else if (food.unitName && food.unitGrams) {
      setUnitMode("unit");
      setAmount("1");
    } else {
      setUnitMode("g");
      setAmount("100");
    }
  };

  const selectRecipe = (recipe: RecipeOption, s?: number | null) => {
    setSelected({ type: "recipe", recipe });
    setServings(String(s ?? 1));
  };

  const grams =
    selected?.type === "food"
      ? (parseNum(amount) ?? 0) * (unitMode === "unit" && selected.food.unitGrams ? selected.food.unitGrams : 1)
      : 0;
  const preview =
    selected?.type === "food"
      ? macrosFor(selected.food, grams)
      : selected?.type === "recipe"
        ? scaleMacros({ ...selected.recipe, fiber: 0 }, parseNum(servings) ?? 0)
        : null;

  function submit(keepOpen = false) {
    start(async () => {
      let res;
      if (tab === "rapido") {
        const kcal = parseNum(quick.kcal);
        if (!quick.name.trim() || kcal == null) return void toast.error("Completá nombre y calorías");
        res = await addFoodLog({
          kind: "quick",
          date,
          meal: mealSel,
          name: quick.name,
          kcal,
          protein: parseNum(quick.protein) ?? undefined,
          carbs: parseNum(quick.carbs) ?? undefined,
          fat: parseNum(quick.fat) ?? undefined,
        });
      } else if (selected?.type === "food") {
        if (!(grams > 0)) return void toast.error("Indicá la cantidad");
        res = await addFoodLog({ kind: "food", date, meal: mealSel, foodId: selected.food.id, grams });
      } else if (selected?.type === "recipe") {
        const s = parseNum(servings);
        if (!s || s <= 0) return void toast.error("Indicá las porciones");
        res = await addFoodLog({ kind: "recipe", date, meal: mealSel, recipeId: selected.recipe.id, servings: s });
      } else return;
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Agregado");
      if (keepOpen) {
        setSelected(null);
        setQuery("");
      } else {
        setOpen(false);
        reset();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setMealSel(meal);
        else reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <Plus className="size-4" /> Agregar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-3 overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar al diario</DialogTitle>
          <DialogDescription className="sr-only">Buscá un alimento o receta</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <NativeSelect value={mealSel} onChange={(e) => setMealSel(e.target.value as MealKey)} className="w-auto">
            {MEALS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.emoji} {m.label}
              </option>
            ))}
          </NativeSelect>
          <div className="ml-auto flex rounded-lg border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTab("buscar")}
              className={cn("rounded-md px-2.5 py-1 font-medium", tab === "buscar" ? "bg-muted" : "text-muted-foreground")}
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={() => setTab("rapido")}
              className={cn("rounded-md px-2.5 py-1 font-medium", tab === "rapido" ? "bg-muted" : "text-muted-foreground")}
            >
              <Zap className="mr-1 inline size-3" />
              Rápido
            </button>
          </div>
        </div>

        {tab === "rapido" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="¿Qué comiste?" className="col-span-2">
              <Input value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} placeholder="Ej: sándwich del bar" autoFocus />
            </Field>
            <Field label="Calorías (kcal)">
              <Input inputMode="decimal" value={quick.kcal} onChange={(e) => setQuick({ ...quick, kcal: e.target.value })} />
            </Field>
            <Field label="Proteínas (g)">
              <Input inputMode="decimal" value={quick.protein} onChange={(e) => setQuick({ ...quick, protein: e.target.value })} />
            </Field>
            <Field label="Carbohidratos (g)">
              <Input inputMode="decimal" value={quick.carbs} onChange={(e) => setQuick({ ...quick, carbs: e.target.value })} />
            </Field>
            <Field label="Grasas (g)">
              <Input inputMode="decimal" value={quick.fat} onChange={(e) => setQuick({ ...quick, fat: e.target.value })} />
            </Field>
            <Button className="col-span-2" onClick={() => submit()} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Agregar
            </Button>
          </div>
        ) : selected ? (
          <div className="space-y-4">
            <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3" /> Volver a buscar
            </button>
            <div>
              <div className="text-base font-semibold">
                {selected.type === "recipe" ? `${selected.recipe.emoji ?? "🍽️"} ${selected.recipe.name}` : selected.food.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {selected.type === "recipe"
                  ? `${fmtInt(selected.recipe.kcal)} kcal por porción`
                  : `${fmtInt(selected.food.kcal)} kcal cada 100 g${selected.food.unitName && selected.food.unitGrams ? ` · 1 ${selected.food.unitName} ≈ ${fmtInt(selected.food.unitGrams)} g` : ""}`}
              </div>
            </div>

            {selected.type === "food" ? (
              <div className="flex items-end gap-2">
                <Field label="Cantidad" className="flex-1">
                  <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
                </Field>
                {selected.food.unitName && selected.food.unitGrams ? (
                  <NativeSelect
                    className="w-36"
                    value={unitMode}
                    onChange={(e) => {
                      const mode = e.target.value as "g" | "unit";
                      const g = grams;
                      setUnitMode(mode);
                      setAmount(mode === "g" ? String(Math.round(g)) : fmtDec(g / selected.food.unitGrams!, 2).replace(",", "."));
                    }}
                  >
                    <option value="g">gramos</option>
                    <option value="unit">{selected.food.unitName}</option>
                  </NativeSelect>
                ) : (
                  <span className="pb-2 text-sm text-muted-foreground">gramos</span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Field label="Porciones">
                  <Input inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} autoFocus />
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setServings(String(s))}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs",
                        parseNum(servings) === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                      )}
                    >
                      {fmtDec(s, 2)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {preview && (
              <div className="grid grid-cols-4 gap-2 rounded-xl bg-muted/60 p-3 text-center">
                <div>
                  <div className="text-lg font-semibold tabular">{fmtInt(preview.kcal)}</div>
                  <div className="text-[11px] text-muted-foreground">kcal</div>
                </div>
                <div>
                  <div className="text-lg font-semibold tabular">{fmtDec(preview.protein)}</div>
                  <div className="text-[11px] text-muted-foreground">prot (g)</div>
                </div>
                <div>
                  <div className="text-lg font-semibold tabular">{fmtDec(preview.carbs)}</div>
                  <div className="text-[11px] text-muted-foreground">carbs (g)</div>
                </div>
                <div>
                  <div className="text-lg font-semibold tabular">{fmtDec(preview.fat)}</div>
                  <div className="text-[11px] text-muted-foreground">grasas (g)</div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => submit(true)} disabled={pending}>
                Agregar y seguir
              </Button>
              <Button className="flex-1" onClick={() => submit()} disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />} Agregar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscá: pollo, avena, milanesa…"
                className="pl-8"
                autoFocus
              />
            </div>
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1" style={{ maxHeight: "55dvh" }}>
              {results ? (
                <>
                  {results.recipes.length > 0 && <ListLabel>Recetas</ListLabel>}
                  {results.recipes.map((r) => (
                    <ResultRow key={`r${r.id}`} onClick={() => selectRecipe(r)} title={`${r.emoji ?? "🍽️"} ${r.name}`} meta={`${fmtInt(r.kcal)} kcal/porción`} />
                  ))}
                  {results.foods.length > 0 && <ListLabel>Alimentos</ListLabel>}
                  {results.foods.map((f) => (
                    <ResultRow
                      key={`f${f.id}`}
                      onClick={() => selectFood(f)}
                      title={f.name}
                      meta={`${fmtInt(f.kcal)} kcal/100 g · ${FOOD_CATEGORIES[f.category] ?? f.category}`}
                    />
                  ))}
                  {!results.recipes.length && !results.foods.length && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No encontré nada. Probá con otra palabra o usá <b>Rápido</b>.
                    </div>
                  )}
                </>
              ) : (
                <>
                  {frequent.length > 0 && <ListLabel>Lo que más registrás</ListLabel>}
                  {frequent.map((it, i) => {
                    const food = it.foodId ? foods.find((f) => f.id === it.foodId) : null;
                    const recipe = it.recipeId ? recipes.find((r) => r.id === it.recipeId) : null;
                    if (!food && !recipe) return null;
                    return (
                      <ResultRow
                        key={`q${i}`}
                        onClick={() => (recipe ? selectRecipe(recipe, it.servings) : selectFood(food!, it.grams))}
                        title={recipe ? `${recipe.emoji ?? "🍽️"} ${recipe.name}` : food!.name}
                        meta={recipe ? `${fmtDec(it.servings ?? 1, 2)} porción · ${fmtInt(it.kcal)} kcal` : `${fmtInt(it.grams ?? 0)} g · ${fmtInt(it.kcal)} kcal`}
                      />
                    );
                  })}
                  <ListLabel>
                    <Star className="mr-1 inline size-3" />
                    Recetas para {MEALS.find((m) => m.key === mealSel)?.label.toLowerCase()}
                  </ListLabel>
                  {recipes
                    .filter((r) => r.mealTypes.includes(mealSel))
                    .slice(0, 12)
                    .map((r) => (
                      <ResultRow key={`s${r.id}`} onClick={() => selectRecipe(r)} title={`${r.emoji ?? "🍽️"} ${r.name}`} meta={`${fmtInt(r.kcal)} kcal/porción`} />
                    ))}
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ListLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-1 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{children}</div>;
}

function ResultRow({ title, meta, onClick }: { title: string; meta: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted">
      <span className="min-w-0 truncate text-sm">{title}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular">{meta}</span>
    </button>
  );
}
