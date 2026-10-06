"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Share2, ShoppingCart, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, NativeSelect } from "@/components/form-fields";
import {
  addShoppingItem,
  createShoppingList,
  deleteShoppingItem,
  setShoppingItemPrice,
  toggleShoppingItem,
} from "@/app/actions/nutrition";
import { STORES } from "@/lib/constants";
import { fmtARS, parseNum } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ------------------------------ Crear lista ------------------------------ */

export function NewShoppingListForm({
  thisWeek,
  nextWeek,
  today,
}: {
  thisWeek: string;
  nextWeek: string;
  today: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState("semana-actual");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [weeks, setWeeks] = useState("4");
  const [includeBaby, setIncludeBaby] = useState(true);
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      let input: Parameters<typeof createShoppingList>[0];
      if (mode === "semana-actual") input = { mode: "semana", from: thisWeek, includeBaby };
      else if (mode === "semana-proxima") input = { mode: "semana", from: nextWeek, includeBaby };
      else if (mode === "mes") input = { mode: "mes", from: today, includeBaby };
      else if (mode === "proyeccion") input = { mode: "proyeccion", from: thisWeek, weeks: parseNum(weeks) ?? 4, includeBaby };
      else input = { mode: "rango", from, to, includeBaby };
      const res = await createShoppingList(input);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.push(`/nutricion/compras/${res.data!.id}`);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="¿Para qué período?" className="sm:col-span-2">
        <NativeSelect value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="semana-actual">Esta semana (según el plan)</option>
          <option value="semana-proxima">Próxima semana (según el plan)</option>
          <option value="mes">Mes actual (todo lo planificado del mes)</option>
          <option value="proyeccion">Compra mensual: proyectar esta semana × N semanas</option>
          <option value="rango">Rango de fechas personalizado</option>
        </NativeSelect>
      </Field>
      {mode === "proyeccion" && (
        <Field label="Cantidad de semanas" hint="Ideal para la compra grande del mes (secos, latas, despensa).">
          <Input inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} />
        </Field>
      )}
      {mode === "rango" && (
        <>
          <Field label="Desde">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </>
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <Checkbox checked={includeBaby} onCheckedChange={(c) => setIncludeBaby(Boolean(c))} /> Incluir las comidas planificadas del bebé
      </label>
      <Button onClick={submit} disabled={pending} className="sm:col-span-2">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />} Generar lista
      </Button>
    </div>
  );
}

/* ------------------------------ Ítems ------------------------------ */

export function ShoppingItemRow({
  item,
}: {
  item: { id: number; name: string; checked: boolean; qty: string; hint: string | null; priceArs: number | null; isManual: boolean };
}) {
  const [checked, setChecked] = useOptimistic(item.checked);
  const [, start] = useTransition();
  return (
    <div className="group flex items-center gap-3 px-3 py-2.5">
      <Checkbox
        checked={checked}
        onCheckedChange={() =>
          start(async () => {
            setChecked(!checked);
            await toggleShoppingItem(item.id);
          })
        }
        className="size-5"
        aria-label={`Marcar ${item.name}`}
      />
      <div className={cn("min-w-0 flex-1", checked && "text-muted-foreground line-through")}>
        <div className="truncate text-sm">{item.name}</div>
        {item.hint && <div className="text-[11px] text-muted-foreground">{item.hint}</div>}
      </div>
      <div className={cn("shrink-0 text-right text-sm font-medium tabular", checked && "text-muted-foreground")}>{item.qty}</div>
      <PriceButton id={item.id} price={item.priceArs} canSave={!item.isManual} />
      {item.isManual && (
        <button
          type="button"
          onClick={() => start(async () => void (await deleteShoppingItem(item.id)))}
          className="text-muted-foreground opacity-50 hover:text-destructive group-hover:opacity-100"
          aria-label="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function PriceButton({ id, price, canSave }: { id: number; price: number | null; canSave: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(price?.toString() ?? "");
  const [save, setSave] = useState(true);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-w-14 shrink-0 items-center justify-end gap-1 text-xs tabular",
            price != null ? "text-foreground/80" : "text-muted-foreground/60 hover:text-foreground",
          )}
        >
          {price != null ? fmtARS(price) : <Tag className="size-3.5" />}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Precio pagado</DialogTitle>
          <DialogDescription>Sirve para estimar el gasto de las próximas listas (y para el futuro módulo de finanzas).</DialogDescription>
        </DialogHeader>
        <Field label="Precio total ($)">
          <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </Field>
        {canSave && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={save} onCheckedChange={(c) => setSave(Boolean(c))} /> Guardar como precio habitual del alimento
          </label>
        )}
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setShoppingItemPrice(id, parseNum(value), save && canSave);
              if (!res.ok) return void toast.error(res.error);
              setOpen(false);
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Guardar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function AddManualItem({ listId }: { listId: number }) {
  return (
    <ActionForm action={addShoppingItem.bind(null, listId)} resetOnSuccess className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_8rem_6rem_auto]">
      <Input name="name" placeholder="Agregar algo más (ej: detergente, pañales…)" />
      <NativeSelect name="store" defaultValue="supermercado" className="hidden sm:block">
        {Object.entries(STORES).map(([k, s]) => (
          <option key={k} value={k}>
            {s.label}
          </option>
        ))}
      </NativeSelect>
      <Input name="unit" placeholder="cant." className="hidden sm:block" />
      <SubmitButton size="icon" aria-label="Agregar">
        <Plus className="size-4" />
      </SubmitButton>
    </ActionForm>
  );
}

export function ShareListButton({ text }: { text: string }) {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        try {
          if (navigator.share) {
            await navigator.share({ title: "Lista de compras", text });
            return;
          }
        } catch {
          /* cancelado */
        }
        try {
          await navigator.clipboard.writeText(text);
          toast.success("Lista copiada: pegala en WhatsApp o donde quieras");
        } catch {
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
        }
      }}
    >
      <Share2 className="size-4" /> Compartir
    </Button>
  );
}
