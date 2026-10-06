"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form-fields";
import { updateFoodLogAmount } from "@/app/actions/nutrition";
import { fmtInt, parseNum } from "@/lib/format";

/** Tocar un registro del diario para corregir la cantidad. */
export function EditLogAmount({
  id,
  name,
  kind,
  amount,
  kcal,
  children,
}: {
  id: number;
  name: string;
  kind: "grams" | "servings" | "kcal";
  amount: number;
  kcal: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(amount));
  const [pending, start] = useTransition();
  const v = parseNum(value) ?? 0;
  const preview = kind === "kcal" ? v : amount > 0 ? (kcal * v) / amount : 0;
  const label = kind === "grams" ? "Gramos" : kind === "servings" ? "Porciones" : "Calorías";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="min-w-0 flex-1 text-left">
          {children}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>Corregí la cantidad: {fmtInt(preview)} kcal</DialogDescription>
        </DialogHeader>
        <Field label={label}>
          <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </Field>
        <Button
          disabled={pending || !(v > 0)}
          onClick={() =>
            start(async () => {
              const res = await updateFoodLogAmount(id, v);
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
