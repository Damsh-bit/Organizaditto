"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ClipboardList, Copy, Eraser, Loader2, Minus, Plus, Save, ShoppingCart, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/form-fields";
import {
  addPlanItem,
  applyMenuTemplate,
  clearWeekPlan,
  copyWeekPlan,
  createShoppingList,
  generateWeekPlan,
  removePlanItem,
  saveWeekAsTemplate,
  togglePlanItemDone,
  updatePlanServings,
} from "@/app/actions/nutrition";
import type { ActionResult } from "@/lib/action-result";
import { fmtDec, fmtInt } from "@/lib/format";
import { roundServings } from "@/lib/nutrition";
import { matches } from "@/lib/search";
import { cn } from "@/lib/utils";

type RecipeOpt = { id: number; name: string; emoji: string | null; kcal: number; mealTypes: string[]; isFavorite: boolean; babyMinMonths?: number | null };

/* ------------------------------ Fila de un ítem ------------------------------ */

export function PlanItemRow({
  item,
  showKcal = true,
  canMarkDone,
  basePath = "/nutricion/recetas",
}: {
  item: { id: number; servings: number; done: boolean; recipe: { id: number; name: string; emoji: string | null; kcal: number } };
  showKcal?: boolean;
  canMarkDone: boolean;
  basePath?: string;
}) {
  const [servings, setServings] = useOptimistic(item.servings);
  const [pending, start] = useTransition();
  const change = (delta: number) => {
    const next = Math.max(0.25, roundServings(servings + delta));
    start(async () => {
      setServings(next);
      await updatePlanServings(item.id, next);
    });
  };
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else if (res.message) toast.success(res.message);
    });

  return (
    <div className={cn("group flex items-center gap-2 rounded-lg px-1.5 py-1.5", item.done && "opacity-60")}>
      {canMarkDone && (
        <Checkbox
          checked={item.done}
          onCheckedChange={() => run(() => togglePlanItemDone(item.id))}
          aria-label="Marcar como comido"
          disabled={pending}
        />
      )}
      <span className="text-lg leading-none">{item.recipe.emoji ?? "🍽️"}</span>
      <Link href={`${basePath}/${item.recipe.id}`} className={cn("min-w-0 flex-1 truncate text-sm hover:underline", item.done && "line-through")}>
        {item.recipe.name}
      </Link>
      <div className="flex items-center rounded-md border">
        <button type="button" className="grid size-6 place-items-center text-muted-foreground hover:text-foreground" onClick={() => change(-0.25)} aria-label="Menos">
          <Minus className="size-3" />
        </button>
        <span className="w-9 text-center text-xs tabular">{fmtDec(servings, 2)}</span>
        <button type="button" className="grid size-6 place-items-center text-muted-foreground hover:text-foreground" onClick={() => change(0.25)} aria-label="Más">
          <Plus className="size-3" />
        </button>
      </div>
      {showKcal && <span className="w-12 text-right text-xs text-muted-foreground tabular">{fmtInt(item.recipe.kcal * servings)}</span>}
      <button
        type="button"
        onClick={() => run(() => removePlanItem(item.id))}
        className="grid size-6 place-items-center rounded text-muted-foreground opacity-60 hover:bg-muted hover:text-destructive group-hover:opacity-100"
        aria-label="Quitar"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------ Agregar receta a una comida ------------------------------ */

export function AddToSlotButton({
  date,
  meal,
  mealLabel,
  recipes,
  slotTarget,
  audience = "adult",
}: {
  date: string;
  meal: string;
  mealLabel: string;
  recipes: RecipeOpt[];
  slotTarget?: number;
  audience?: "adult" | "baby";
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const [pending, start] = useTransition();
  const list = useMemo(
    () => recipes.filter((r) => (all || r.mealTypes.includes(meal)) && matches(r.name, q)).slice(0, 60),
    [recipes, all, meal, q],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1 rounded-lg px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-3" /> {mealLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar a {mealLabel.toLowerCase()}</DialogTitle>
          <DialogDescription>
            {slotTarget ? `Objetivo aproximado para esta comida: ${fmtInt(slotTarget)} kcal` : "Elegí una receta"}
          </DialogDescription>
        </DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" autoFocus />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={all} onCheckedChange={(c) => setAll(Boolean(c))} /> Mostrar recetas de otros momentos del día
        </label>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {list.map((r) => {
            const servings = slotTarget && r.kcal > 0 ? Math.min(2.5, Math.max(0.5, roundServings(slotTarget / r.kcal))) : 1;
            return (
              <button
                key={r.id}
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await addPlanItem({ date, meal: meal as "almuerzo", recipeId: r.id, servings, audience });
                    if (!res.ok) return void toast.error(res.error);
                    setOpen(false);
                  })
                }
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted"
              >
                <span className="text-lg">{r.emoji ?? "🍽️"}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{r.name}</span>
                {audience === "adult" ? (
                  <span className="shrink-0 text-xs text-muted-foreground tabular">
                    {fmtDec(servings, 2)} × {fmtInt(r.kcal)} kcal
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">desde {r.babyMinMonths ?? 6} m</span>
                )}
              </button>
            );
          })}
          {!list.length && <div className="py-6 text-center text-sm text-muted-foreground">Sin resultados</div>}
        </div>
        {pending && <Loader2 className="mx-auto size-4 animate-spin" />}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Barra de herramientas ------------------------------ */

export function PlanToolbar({
  weekStart,
  prevWeekStart,
  templates,
  audience = "adult",
  hasItems,
}: {
  weekStart: string;
  prevWeekStart: string;
  templates: { id: number; name: string; emoji: string | null; description: string | null }[];
  audience?: "adult" | "baby";
  hasItems: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult<unknown>>, after?: (r: ActionResult<unknown>) => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      if (res.message) toast.success(res.message);
      after?.(res);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {audience === "adult" && <GenerateDialog weekStart={weekStart} />}
      <ApplyMenuDialog weekStart={weekStart} templates={templates} audience={audience} />
      <Button
        variant="outline"
        disabled={pending || !hasItems}
        onClick={() =>
          run(
            () => createShoppingList({ mode: "semana", from: weekStart, includeBaby: true }),
            (r) => r.ok && r.data && router.push(`/nutricion/compras/${(r.data as { id: number }).id}`),
          )
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />} Lista de compras
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" disabled={pending}>
            Más…
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => run(() => copyWeekPlan(prevWeekStart, weekStart, audience))}>
            <Copy className="size-4" /> Repetir semana anterior
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasItems}
            onSelect={() => {
              const name = window.prompt("Nombre para este menú semanal:");
              if (name) run(() => saveWeekAsTemplate(weekStart, name, audience));
            }}
          >
            <Save className="size-4" /> Guardar como menú
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasItems}
            onSelect={() => {
              if (window.confirm("¿Vaciar la semana? Se conservan las comidas ya marcadas como comidas.")) run(() => clearWeekPlan(weekStart, audience));
            }}
            className="text-destructive"
          >
            <Eraser className="size-4" /> Vaciar semana
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GenerateDialog({ weekStart }: { weekStart: string }) {
  const [open, setOpen] = useState(false);
  const [mealPrep, setMealPrep] = useState(true);
  const [replace, setReplace] = useState(true);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-nutri text-white hover:bg-nutri/90">
          <Sparkles className="size-4" /> Generar semana
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar semana automáticamente</DialogTitle>
          <DialogDescription>
            Armo un menú variado con tus recetas (priorizando favoritas) ajustando porciones para llegar a tu objetivo calórico diario.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox checked={mealPrep} onCheckedChange={(c) => setMealPrep(Boolean(c))} className="mt-0.5" />
          <span className="text-sm">
            <span className="font-medium">Modo vianda / meal prep</span>
            <br />
            <span className="text-muted-foreground">Lo que cenás se repite como almuerzo del día siguiente: cocinás la mitad de veces.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox checked={replace} onCheckedChange={(c) => setReplace(Boolean(c))} className="mt-0.5" />
          <span className="text-sm">
            <span className="font-medium">Reemplazar lo planificado</span>
            <br />
            <span className="text-muted-foreground">Borra lo pendiente de esta semana (no toca lo que ya marcaste como comido).</span>
          </span>
        </label>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await generateWeekPlan({ weekStart, mealPrep, replace });
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ApplyMenuDialog({
  weekStart,
  templates,
  audience,
}: {
  weekStart: string;
  templates: { id: number; name: string; emoji: string | null; description: string | null }[];
  audience: "adult" | "baby";
}) {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState<number | null>(templates[0]?.id ?? null);
  const [scale, setScale] = useState(true);
  const [replace, setReplace] = useState(true);
  const [pending, start] = useTransition();
  const tpl = templates.find((t) => t.id === templateId);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ClipboardList className="size-4" /> Aplicar menú
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aplicar un menú semanal</DialogTitle>
          <DialogDescription>Cargá un menú armado en esta semana.</DialogDescription>
        </DialogHeader>
        <Field label="Menú">
          <NativeSelect value={templateId ?? ""} onChange={(e) => setTemplateId(Number(e.target.value))}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {tpl?.description && <p className="text-sm text-muted-foreground">{tpl.description}</p>}
        {audience === "adult" && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={scale} onCheckedChange={(c) => setScale(Boolean(c))} /> Ajustar porciones a mi objetivo calórico
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={replace} onCheckedChange={(c) => setReplace(Boolean(c))} /> Reemplazar lo pendiente de la semana
        </label>
        <Button
          disabled={pending || !templateId}
          onClick={() =>
            start(async () => {
              const res = await applyMenuTemplate({ templateId: templateId!, weekStart, scale, replace });
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Aplicar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

