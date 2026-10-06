"use client";

import { useState } from "react";
import { ChevronDown, Scale } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { saveWeight } from "@/app/actions/training";

export type WeightDefaults = {
  date: string;
  weightKg?: number | null;
  bodyFatPct?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  notes?: string | null;
};

export function WeightDialog({
  defaults,
  trigger,
  title = "Registrar peso",
}: {
  defaults: WeightDefaults;
  trigger?: React.ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(Boolean(defaults.waistCm || defaults.bodyFatPct));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-gym text-white dark:text-neutral-950 hover:bg-gym/90">
            <Scale className="size-4" /> Registrar peso
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Pesate siempre igual: en ayunas, después de ir al baño y con la misma ropa.</DialogDescription>
        </DialogHeader>
        <ActionForm action={saveWeight} className="grid grid-cols-2 gap-3" onDone={() => setOpen(false)}>
          <Field label="Fecha">
            <Input type="date" name="date" defaultValue={defaults.date} required />
          </Field>
          <Field label="Peso (kg)">
            <Input name="weightKg" inputMode="decimal" defaultValue={defaults.weightKg ?? ""} required autoFocus />
          </Field>
          <button
            type="button"
            onClick={() => setMore(!more)}
            className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={more ? "size-3 rotate-180" : "size-3"} /> Medidas (opcional)
          </button>
          {more && (
            <>
              <Field label="Cintura (cm)">
                <Input name="waistCm" inputMode="decimal" defaultValue={defaults.waistCm ?? ""} />
              </Field>
              <Field label="Cadera (cm)">
                <Input name="hipCm" inputMode="decimal" defaultValue={defaults.hipCm ?? ""} />
              </Field>
              <Field label="Pecho (cm)">
                <Input name="chestCm" inputMode="decimal" defaultValue={defaults.chestCm ?? ""} />
              </Field>
              <Field label="Brazo (cm)">
                <Input name="armCm" inputMode="decimal" defaultValue={defaults.armCm ?? ""} />
              </Field>
              <Field label="Muslo (cm)">
                <Input name="thighCm" inputMode="decimal" defaultValue={defaults.thighCm ?? ""} />
              </Field>
              <Field label="% grasa corporal">
                <Input name="bodyFatPct" inputMode="decimal" defaultValue={defaults.bodyFatPct ?? ""} />
              </Field>
              <Field label="Nota" className="col-span-2">
                <Input name="notes" defaultValue={defaults.notes ?? ""} />
              </Field>
            </>
          )}
          <SubmitButton className="col-span-2">Guardar</SubmitButton>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
