"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, NativeSelect } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { archiveFood, saveFood } from "@/app/actions/nutrition";
import type { Food } from "@/db/schema";
import { ALLERGENS, FOOD_CATEGORIES, STORES } from "@/lib/constants";
import { fmtARS, fmtDec, fmtInt } from "@/lib/format";
import { matches } from "@/lib/search";
import { cn } from "@/lib/utils";

export function FoodsTable({ foods }: { foods: Food[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const filtered = useMemo(
    () => foods.filter((f) => (!cat || f.category === cat) && matches(f.name, q)),
    [foods, q, cat],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alimento…" className="pl-8" />
        </div>
        <NativeSelect value={cat} onChange={(e) => setCat(e.target.value)} className="sm:w-56">
          <option value="">Todas las categorías</option>
          {Object.entries(FOOD_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
        <FoodDialog
          trigger={
            <Button>
              <Plus className="size-4" /> Nuevo alimento
            </Button>
          }
        />
      </div>
      <div className="text-xs text-muted-foreground">{filtered.length} alimentos · valores cada 100 g</div>
      <div className="overflow-hidden rounded-xl border">
        <div className="hidden grid-cols-[1fr_5rem_4rem_4rem_4rem_7rem_5.5rem] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
          <span>Alimento</span>
          <span className="text-right">kcal</span>
          <span className="text-right">Prot</span>
          <span className="text-right">Carb</span>
          <span className="text-right">Grasa</span>
          <span className="text-right">Precio</span>
          <span />
        </div>
        <div className="divide-y">
          {filtered.map((f) => (
            <div key={f.id} className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2 md:grid-cols-[1fr_5rem_4rem_4rem_4rem_7rem_5.5rem]">
              <div className="min-w-0">
                <div className="truncate text-sm">{f.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {STORES[f.store]?.emoji} {FOOD_CATEGORIES[f.category] ?? f.category}
                  {f.unitName && f.unitGrams ? ` · 1 ${f.unitName} = ${fmtDec(f.unitGrams)} g` : ""}
                  <span className="md:hidden">
                    {" "}
                    · {fmtInt(f.kcal)} kcal · P {fmtDec(f.protein)} · C {fmtDec(f.carbs)} · G {fmtDec(f.fat)}
                  </span>
                </div>
              </div>
              <span className="hidden text-right text-sm tabular md:block">{fmtInt(f.kcal)}</span>
              <span className="hidden text-right text-sm text-muted-foreground tabular md:block">{fmtDec(f.protein)}</span>
              <span className="hidden text-right text-sm text-muted-foreground tabular md:block">{fmtDec(f.carbs)}</span>
              <span className="hidden text-right text-sm text-muted-foreground tabular md:block">{fmtDec(f.fat)}</span>
              <span className="hidden text-right text-xs text-muted-foreground tabular md:block">
                {f.priceArs != null ? `${fmtARS(f.priceArs)}/${f.buyUnit.split(" ")[0]}` : "—"}
              </span>
              <div className="flex justify-end gap-0.5">
                <FoodDialog
                  food={f}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Editar">
                      <Pencil className="size-3.5" />
                    </Button>
                  }
                />
                <ActionButton
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Eliminar"
                  className="text-muted-foreground"
                  action={archiveFood.bind(null, f.id)}
                  confirm={`¿Eliminar "${f.name}"? Las recetas que lo usan lo mantienen.`}
                >
                  <Trash2 className="size-3.5" />
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FoodDialog({ food, trigger }: { food?: Food; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [buyUnit, setBuyUnit] = useState(food?.buyUnit ?? "kg");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{food ? "Editar alimento" : "Nuevo alimento"}</DialogTitle>
          <DialogDescription>Valores nutricionales cada 100 g (los ves en la etiqueta del paquete).</DialogDescription>
        </DialogHeader>
        <ActionForm action={saveFood} className="grid grid-cols-2 gap-3 sm:grid-cols-4" onDone={() => setOpen(false)}>
          {food && <input type="hidden" name="id" value={food.id} />}
          <Field label="Nombre" className="col-span-2 sm:col-span-4">
            <Input name="name" defaultValue={food?.name} required />
          </Field>
          <Field label="Categoría" className="col-span-1 sm:col-span-2">
            <NativeSelect name="category" defaultValue={food?.category ?? "otros"}>
              {Object.entries(FOOD_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Dónde se compra" className="col-span-1 sm:col-span-2">
            <NativeSelect name="store" defaultValue={food?.store ?? "supermercado"}>
              {Object.entries(STORES).map(([k, s]) => (
                <option key={k} value={k}>
                  {s.emoji} {s.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Calorías (kcal)">
            <Input name="kcal" inputMode="decimal" defaultValue={food?.kcal} required />
          </Field>
          <Field label="Proteínas (g)">
            <Input name="protein" inputMode="decimal" defaultValue={food?.protein} />
          </Field>
          <Field label="Carbohidratos (g)">
            <Input name="carbs" inputMode="decimal" defaultValue={food?.carbs} />
          </Field>
          <Field label="Grasas (g)">
            <Input name="fat" inputMode="decimal" defaultValue={food?.fat} />
          </Field>
          <Field label="Fibra (g)">
            <Input name="fiber" inputMode="decimal" defaultValue={food?.fiber} />
          </Field>
          <Field label="Unidad casera" hint="ej: unidad, feta, taza">
            <Input name="unitName" defaultValue={food?.unitName ?? ""} />
          </Field>
          <Field label="Gramos por unidad">
            <Input name="unitGrams" inputMode="decimal" defaultValue={food?.unitGrams ?? ""} />
          </Field>
          <Field label="Alérgeno">
            <NativeSelect name="allergen" defaultValue={food?.allergen ?? ""}>
              <option value="">Ninguno</option>
              {Object.entries(ALLERGENS).map(([k, a]) => (
                <option key={k} value={k}>
                  {a.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Se compra por">
            <NativeSelect name="buyUnit" value={buyUnit} onChange={(e) => setBuyUnit(e.target.value)}>
              {[...new Set(["kg", "unidad", "paquete", "lata", "pote", "frasco", "botella", "docena", "atado", "bandeja", "caja", "sobre", food?.buyUnit ?? "kg"])].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Gramos por unidad de compra" className={cn(buyUnit === "kg" && "opacity-40")}>
            <Input name="buyUnitGrams" inputMode="decimal" defaultValue={food?.buyUnitGrams ?? 1000} disabled={buyUnit === "kg"} />
          </Field>
          <Field label={`Precio por ${buyUnit} ($)`}>
            <Input name="priceArs" inputMode="decimal" defaultValue={food?.priceArs ?? ""} />
          </Field>
          <Field label="Bebé: desde (meses)">
            <Input name="babyFromMonths" inputMode="numeric" defaultValue={food?.babyFromMonths ?? ""} />
          </Field>
          <label className="col-span-2 flex items-center gap-2 text-sm sm:col-span-4">
            <Checkbox name="isPantry" defaultChecked={food?.isPantry} /> Es de despensa (aceite, condimentos…): se lista aparte en las compras
          </label>
          <div className="col-span-2 flex justify-end sm:col-span-4">
            <SubmitButton>Guardar</SubmitButton>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
