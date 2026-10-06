"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/form-fields";
import { addBabyLog } from "@/app/actions/baby";
import { ACCEPTANCE, ALLERGENS, MEALS, type MealKey } from "@/lib/constants";
import { matches } from "@/lib/search";
import { cn } from "@/lib/utils";

type RecipeOpt = { id: number; name: string; emoji: string | null; babyMinMonths: number | null };
type FoodOpt = { id: number; name: string; allergen: string | null; babyFromMonths: number | null };

const FACES = ["", "😖", "😕", "😐", "😊", "😍"];

export function BabyLogDialog({
  date,
  recipes,
  foods,
  months,
  triedFoodIds = [],
  defaultMeal = "almuerzo",
  trigger,
}: {
  date: string;
  recipes: RecipeOpt[];
  foods: FoodOpt[];
  months: number | null;
  triedFoodIds?: number[];
  defaultMeal?: MealKey;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"receta" | "alimento">("receta");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<{ kind: "receta"; item: RecipeOpt } | { kind: "alimento"; item: FoodOpt } | null>(null);
  const [meal, setMeal] = useState<MealKey>(defaultMeal);
  const [amount, setAmount] = useState("");
  const [acceptance, setAcceptance] = useState<number | null>(null);
  const [reaction, setReaction] = useState<"ninguna" | "leve" | "moderada" | "grave">("ninguna");
  const [reactionNotes, setReactionNotes] = useState("");
  const [d, setD] = useState(date);
  const [pending, start] = useTransition();
  const tried = new Set(triedFoodIds);
  const age = months ?? 6;

  const list = useMemo(() => {
    if (tab === "receta") return recipes.filter((r) => matches(r.name, q)).sort((a, b) => (a.babyMinMonths ?? 6) - (b.babyMinMonths ?? 6));
    return foods.filter((f) => matches(f.name, q));
  }, [tab, q, recipes, foods]);

  function reset() {
    setSel(null);
    setQ("");
    setAmount("");
    setAcceptance(null);
    setReaction("ninguna");
    setReactionNotes("");
  }

  function submit() {
    if (!sel) return;
    start(async () => {
      const res = await addBabyLog({
        date: d,
        meal,
        recipeId: sel.kind === "receta" ? sel.item.id : null,
        foodId: sel.kind === "alimento" ? sel.item.id : null,
        amount: amount || null,
        acceptance,
        reaction,
        reactionNotes: reactionNotes || null,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
        else setD(date);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-baby text-white hover:bg-baby/90">
            <Plus className="size-4" /> Registrar comida
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>¿Qué comió?</DialogTitle>
          <DialogDescription>Los alimentos de la receta quedan marcados como “probados”.</DialogDescription>
        </DialogHeader>

        {!sel ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex rounded-lg border p-0.5 text-sm">
              {(["receta", "alimento"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn("flex-1 rounded-md py-1", tab === t ? "bg-muted font-medium" : "text-muted-foreground")}
                >
                  {t === "receta" ? "Receta" : "Alimento suelto"}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="pl-8" autoFocus />
            </div>
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1" style={{ maxHeight: "50dvh" }}>
              {list.map((it) => {
                const minM = "babyMinMonths" in it ? it.babyMinMonths : it.babyFromMonths;
                const tooEarly = (minM ?? 6) > age;
                const isFood = !("babyMinMonths" in it);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setSel(isFood ? { kind: "alimento", item: it as FoodOpt } : { kind: "receta", item: it as RecipeOpt })}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted"
                  >
                    {"emoji" in it && <span className="text-lg">{it.emoji}</span>}
                    <span className="min-w-0 flex-1 truncate text-sm">{it.name}</span>
                    {isFood && (it as FoodOpt).allergen && (
                      <span className="text-[11px] text-amber-600">alérgeno: {ALLERGENS[(it as FoodOpt).allergen!]?.label}</span>
                    )}
                    {isFood && !tried.has(it.id) && <span className="rounded-full bg-baby/15 px-1.5 text-[10px] text-baby">nuevo</span>}
                    <span className={cn("shrink-0 text-xs", tooEarly ? "text-amber-600" : "text-muted-foreground")}>
                      {minM ? `${minM} m` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">
                {"emoji" in sel.item ? `${sel.item.emoji} ` : ""}
                {sel.item.name}
              </div>
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSel(null)}>
                Cambiar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha">
                <Input type="date" value={d} onChange={(e) => setD(e.target.value)} />
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
              <Field label="Cuánto comió (opcional)" className="col-span-2">
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ej: 4 cucharadas, medio plato…" />
              </Field>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">¿Le gustó?</div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAcceptance(acceptance === n ? null : n)}
                    className={cn(
                      "flex flex-1 flex-col items-center rounded-lg border py-1.5 text-2xl transition-colors",
                      acceptance === n ? "border-baby bg-baby/10" : "hover:bg-muted",
                    )}
                    title={ACCEPTANCE[n]}
                  >
                    {FACES[n]}
                    <span className="text-[10px] text-muted-foreground">{ACCEPTANCE[n]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">¿Tuvo alguna reacción?</div>
              <div className="flex rounded-lg border p-0.5 text-sm">
                {(["ninguna", "leve", "moderada", "grave"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReaction(r)}
                    className={cn(
                      "flex-1 rounded-md py-1 capitalize",
                      reaction === r ? (r === "ninguna" ? "bg-muted font-medium" : "bg-amber-500 font-medium text-white") : "text-muted-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {reaction !== "ninguna" && (
                <Input
                  className="mt-2"
                  value={reactionNotes}
                  onChange={(e) => setReactionNotes(e.target.value)}
                  placeholder="¿Qué pasó? (ronchas, vómito, diarrea…)"
                />
              )}
              {reaction === "grave" && (
                <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  Si hay dificultad para respirar, hinchazón de cara o labios o decaimiento, llamá al 107 / 911 o andá a la guardia.
                </p>
              )}
            </div>
            <Button className="w-full bg-baby text-white hover:bg-baby/90" onClick={submit} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Guardar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
