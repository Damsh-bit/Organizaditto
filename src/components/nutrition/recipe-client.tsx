"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Loader2, Minus, Plus, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/form-fields";
import { addFoodLog, addPlanItem, duplicateRecipe } from "@/app/actions/nutrition";
import { MEALS, type MealKey } from "@/lib/constants";
import { fmtDec, fmtInt, parseNum } from "@/lib/format";
import { ingredientAmount } from "@/lib/recipes";
import { cn } from "@/lib/utils";

export type IngredientRow = {
  id: number;
  grams: number;
  note: string | null;
  optional: boolean;
  food: { name: string; unitName: string | null; unitGrams: number | null };
};

export function IngredientScaler({ ingredients, baseServings }: { ingredients: IngredientRow[]; baseServings: number }) {
  const [servings, setServings] = useState(baseServings);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const factor = servings / baseServings;
  const step = baseServings >= 4 ? 1 : 0.5;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">Cantidades para</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => setServings(Math.max(step, servings - step))} aria-label="Menos porciones">
            <Minus className="size-3.5" />
          </Button>
          <span className="w-24 text-center text-sm font-medium tabular">
            {fmtDec(servings, 1)} {servings === 1 ? "porción" : "porciones"}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => setServings(servings + step)} aria-label="Más porciones">
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>
      <ul className="divide-y rounded-xl border">
        {ingredients.map((ing) => {
          const isChecked = checked.has(ing.id);
          return (
            <li key={ing.id}>
              <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(v) => {
                    const next = new Set(checked);
                    if (v) next.add(ing.id);
                    else next.delete(ing.id);
                    setChecked(next);
                  }}
                  className="mt-0.5"
                />
                <span className={cn("min-w-0 flex-1 text-sm", isChecked && "text-muted-foreground line-through")}>
                  {ing.food.name}
                  {ing.note && <span className="text-muted-foreground"> · {ing.note}</span>}
                  {ing.optional && <span className="text-muted-foreground"> (opcional)</span>}
                </span>
                <span className="shrink-0 text-right text-sm text-muted-foreground tabular">{ingredientAmount(ing.grams * factor, ing.food)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function todayAR() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

export function RecipeActions({
  recipeId,
  mealTypes,
  kcal,
  audience,
  editHref,
}: {
  recipeId: number;
  mealTypes: string[];
  kcal: number;
  audience: "adult" | "baby";
  editHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <PlanDialog recipeId={recipeId} mealTypes={mealTypes} audience={audience} />
      {audience === "adult" && <LogDialog recipeId={recipeId} mealTypes={mealTypes} kcal={kcal} />}
      <Button variant="outline" onClick={() => router.push(editHref)}>
        Editar
      </Button>
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await duplicateRecipe(recipeId);
            if (!res.ok) return void toast.error(res.error);
            toast.success("Copia creada: editala a tu gusto");
            router.push(editHref.replace(String(recipeId), String(res.data!.id)));
          })
        }
      >
        Duplicar
      </Button>
    </div>
  );
}

function PlanDialog({ recipeId, mealTypes, audience }: { recipeId: number; mealTypes: string[]; audience: "adult" | "baby" }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayAR());
  const [meal, setMeal] = useState<MealKey>((mealTypes[0] as MealKey) ?? "almuerzo");
  const [servings, setServings] = useState("1");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarPlus className="size-4" /> Al plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar al plan semanal</DialogTitle>
          <DialogDescription>Elegí el día y la comida.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Día" className="col-span-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Comida">
            <NativeSelect value={meal} onChange={(e) => setMeal(e.target.value as MealKey)}>
              {MEALS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Porciones">
            <Input inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} />
          </Field>
        </div>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await addPlanItem({ date, meal, recipeId, servings: parseNum(servings) ?? 1, audience });
              if (!res.ok) return void toast.error(res.error);
              toast.success("Agregado al plan");
              setOpen(false);
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Agregar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function LogDialog({ recipeId, mealTypes, kcal }: { recipeId: number; mealTypes: string[]; kcal: number }) {
  const [open, setOpen] = useState(false);
  const [meal, setMeal] = useState<MealKey>((mealTypes[0] as MealKey) ?? "almuerzo");
  const [servings, setServings] = useState("1");
  const [pending, start] = useTransition();
  const s = parseNum(servings) ?? 0;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Utensils className="size-4" /> Lo comí hoy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar en el diario de hoy</DialogTitle>
          <DialogDescription>{fmtInt(kcal * s)} kcal</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Comida">
            <NativeSelect value={meal} onChange={(e) => setMeal(e.target.value as MealKey)}>
              {MEALS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Porciones">
            <Input inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} />
          </Field>
        </div>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await addFoodLog({ kind: "recipe", date: todayAR(), meal, recipeId, servings: s || 1 });
              if (!res.ok) return void toast.error(res.error);
              toast.success("¡Registrado!");
              setOpen(false);
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Registrar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
