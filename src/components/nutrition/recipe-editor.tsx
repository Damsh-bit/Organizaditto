"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/form-fields";
import { saveRecipe } from "@/app/actions/nutrition";
import { MEALS, type MealKey } from "@/lib/constants";
import { fmtDec, fmtInt, parseNum } from "@/lib/format";
import { macrosFor, scaleMacros, sumMacros } from "@/lib/nutrition";
import type { FoodOption } from "@/lib/data/nutrition";
import type { RecipeEditorValue } from "@/lib/recipes";
import { FoodPicker } from "./food-picker";


type IngRow = { key: number; foodId: number | null; grams: string; note: string; optional: boolean };

let keySeq = 1;

export function RecipeEditor({ initial, foods, basePath }: { initial: RecipeEditorValue; foods: FoodOption[]; basePath: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState({
    name: initial.name,
    emoji: initial.emoji,
    description: initial.description,
    audience: initial.audience,
    mealTypes: initial.mealTypes,
    tags: initial.tags.join(", "),
    servings: String(initial.servings),
    prepMinutes: initial.prepMinutes?.toString() ?? "",
    cookMinutes: initial.cookMinutes?.toString() ?? "",
    difficulty: initial.difficulty,
    steps: initial.steps.join("\n"),
    tips: initial.tips,
    storage: initial.storage,
    babyMinMonths: initial.babyMinMonths?.toString() ?? "6",
    babyTexture: initial.babyTexture,
  });
  const [rows, setRows] = useState<IngRow[]>(
    initial.ingredients.length
      ? initial.ingredients.map((i) => ({ key: keySeq++, foodId: i.foodId, grams: String(i.grams), note: i.note ?? "", optional: i.optional }))
      : [{ key: keySeq++, foodId: null, grams: "", note: "", optional: false }],
  );

  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));
  const foodById = new Map(foods.map((f) => [f.id, f]));
  const servings = parseNum(v.servings) ?? 1;
  const total = sumMacros(
    rows
      .filter((r) => r.foodId && !r.optional && foodById.has(r.foodId))
      .map((r) => macrosFor(foodById.get(r.foodId!)!, parseNum(r.grams) ?? 0)),
  );
  const per = scaleMacros(total, 1 / Math.max(0.1, servings));

  const updateRow = (key: number, patch: Partial<IngRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function submit() {
    const ingredients = rows
      .filter((r) => r.foodId && (parseNum(r.grams) ?? 0) > 0)
      .map((r) => ({ foodId: r.foodId!, grams: parseNum(r.grams)!, note: r.note || null, optional: r.optional }));
    start(async () => {
      const res = await saveRecipe({
        id: initial.id,
        name: v.name,
        emoji: v.emoji || null,
        description: v.description || null,
        audience: v.audience,
        mealTypes: v.mealTypes as MealKey[],
        tags: v.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
        servings,
        prepMinutes: parseNum(v.prepMinutes),
        cookMinutes: parseNum(v.cookMinutes),
        difficulty: (["fácil", "media", "difícil"].includes(v.difficulty) ? v.difficulty : "fácil") as "fácil",
        steps: v.steps
          .split("\n")
          .map((s) => s.replace(/^\s*\d+[.)-]\s*/, "").trim())
          .filter(Boolean),
        tips: v.tips || null,
        storage: v.storage || null,
        babyMinMonths: v.audience === "baby" ? (parseNum(v.babyMinMonths) ?? 6) : null,
        babyTexture: v.babyTexture || null,
        ingredients,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Receta guardada");
      const id = res.data?.id ?? initial.id;
      router.push(`${v.audience === "baby" ? "/bebe/recetas" : "/nutricion/recetas"}/${id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-6">
          <Field label="Emoji" className="sm:col-span-1">
            <Input value={v.emoji} onChange={(e) => set("emoji", e.target.value)} maxLength={8} className="text-center text-xl" />
          </Field>
          <Field label="Nombre" className="sm:col-span-5">
            <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: Pollo al limón con arroz" />
          </Field>
          <Field label="Descripción" className="sm:col-span-6">
            <Input value={v.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Para" className="sm:col-span-2">
            <NativeSelect value={v.audience} onChange={(e) => set("audience", e.target.value as "adult" | "baby")}>
              <option value="adult">Adultos (déficit)</option>
              <option value="baby">Bebé</option>
            </NativeSelect>
          </Field>
          <Field label="Rinde (porciones)" className="sm:col-span-2">
            <Input inputMode="decimal" value={v.servings} onChange={(e) => set("servings", e.target.value)} />
          </Field>
          <Field label="Dificultad" className="sm:col-span-2">
            <NativeSelect value={v.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
              <option value="fácil">Fácil</option>
              <option value="media">Media</option>
              <option value="difícil">Difícil</option>
            </NativeSelect>
          </Field>
          <Field label="Preparación (min)" className="sm:col-span-3">
            <Input inputMode="numeric" value={v.prepMinutes} onChange={(e) => set("prepMinutes", e.target.value)} />
          </Field>
          <Field label="Cocción (min)" className="sm:col-span-3">
            <Input inputMode="numeric" value={v.cookMinutes} onChange={(e) => set("cookMinutes", e.target.value)} />
          </Field>
          {v.audience === "baby" && (
            <>
              <Field label="Desde (meses)" className="sm:col-span-2">
                <Input inputMode="numeric" value={v.babyMinMonths} onChange={(e) => set("babyMinMonths", e.target.value)} />
              </Field>
              <Field label="Textura" className="sm:col-span-4">
                <NativeSelect value={v.babyTexture} onChange={(e) => set("babyTexture", e.target.value)}>
                  <option value="">—</option>
                  <option value="puré liso">Puré liso</option>
                  <option value="puré grumoso">Puré grumoso</option>
                  <option value="papilla">Papilla</option>
                  <option value="picado">Picado</option>
                  <option value="BLW trozos blandos">BLW trozos blandos</option>
                  <option value="BLW tiras">BLW tiras</option>
                  <option value="comida familiar">Comida familiar</option>
                </NativeSelect>
              </Field>
            </>
          )}
          <div className="sm:col-span-6">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Momento del día</div>
            <div className="flex flex-wrap gap-3">
              {MEALS.map((m) => (
                <label key={m.key} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={v.mealTypes.includes(m.key)}
                    onCheckedChange={(c) =>
                      set("mealTypes", c ? [...v.mealTypes, m.key] : v.mealTypes.filter((x) => x !== m.key))
                    }
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          <Field label="Etiquetas (separadas por coma)" className="sm:col-span-6">
            <Input value={v.tags} onChange={(e) => set("tags", e.target.value)} placeholder="alto en proteína, meal prep, rápido" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ingredientes</CardTitle>
          <span className="text-xs text-muted-foreground">gramos totales de la receta (en crudo)</span>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((r) => {
            const food = r.foodId ? foodById.get(r.foodId) : null;
            const g = parseNum(r.grams) ?? 0;
            return (
              <div key={r.key} className="grid grid-cols-[1fr_5.5rem_auto] items-center gap-2 rounded-lg border p-2 sm:grid-cols-[auto_1fr_6rem_10rem_auto_auto]">
                <GripVertical className="hidden size-4 text-muted-foreground sm:block" />
                <FoodPicker foods={foods} value={r.foodId} onChange={(id) => updateRow(r.key, { foodId: id })} />
                <Input inputMode="decimal" placeholder="g" value={r.grams} onChange={(e) => updateRow(r.key, { grams: e.target.value })} />
                <Input
                  className="col-span-2 sm:col-span-1"
                  placeholder="nota (opcional)"
                  value={r.note}
                  onChange={(e) => updateRow(r.key, { note: e.target.value })}
                />
                <label className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                  <Checkbox checked={r.optional} onCheckedChange={(c) => updateRow(r.key, { optional: Boolean(c) })} /> opc.
                </label>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="row-start-1 col-start-3 sm:row-auto sm:col-auto"
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  aria-label="Quitar"
                >
                  <Trash2 className="size-3.5" />
                </Button>
                {food && g > 0 && (
                  <div className="col-span-3 text-[11px] text-muted-foreground sm:col-span-6 sm:pl-6">
                    {fmtInt((food.kcal * g) / 100)} kcal
                    {food.unitName && food.unitGrams ? ` · ≈ ${fmtDec(g / food.unitGrams, 2)} ${food.unitName}` : ""}
                  </div>
                )}
              </div>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRows((rs) => [...rs, { key: keySeq++, foodId: null, grams: "", note: "", optional: false }])}
          >
            <Plus className="size-4" /> Ingrediente
          </Button>
          <div className="grid grid-cols-4 gap-2 rounded-xl bg-muted/60 p-3 text-center text-sm">
            <div>
              <div className="font-semibold tabular">{fmtInt(per.kcal)}</div>
              <div className="text-[11px] text-muted-foreground">kcal/porción</div>
            </div>
            <div>
              <div className="font-semibold tabular">{fmtDec(per.protein)} g</div>
              <div className="text-[11px] text-muted-foreground">proteínas</div>
            </div>
            <div>
              <div className="font-semibold tabular">{fmtDec(per.carbs)} g</div>
              <div className="text-[11px] text-muted-foreground">carbohidratos</div>
            </div>
            <div>
              <div className="font-semibold tabular">{fmtDec(per.fat)} g</div>
              <div className="text-[11px] text-muted-foreground">grasas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preparación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Pasos (uno por línea)">
            <Textarea rows={8} value={v.steps} onChange={(e) => set("steps", e.target.value)} placeholder={"Precalentá el horno a 200 °C.\nCortá las verduras…"} />
          </Field>
          <Field label="Tip (opcional)">
            <Textarea rows={2} value={v.tips} onChange={(e) => set("tips", e.target.value)} />
          </Field>
          <Field label="Conservación (opcional)">
            <Input value={v.storage} onChange={(e) => set("storage", e.target.value)} placeholder="4 días en heladera, se puede freezar" />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.push(initial.id ? `${basePath}/${initial.id}` : basePath)}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={pending} size="lg">
          {pending && <Loader2 className="size-4 animate-spin" />} Guardar receta
        </Button>
      </div>
    </div>
  );
}

