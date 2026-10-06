"use client";

import { useId, useState, useTransition } from "react";
import { Check, Loader2, Plus, Ruler, Syringe } from "lucide-react";
import { toast } from "sonner";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { addExtraVaccine, markVaccine, saveMeasurement } from "@/app/actions/baby";

const babyButton = "bg-baby text-white dark:text-neutral-950 hover:bg-baby/90";

export function MeasurementDialog({
  today,
  defaults,
  trigger,
}: {
  today: string;
  defaults?: { date: string; weightKg: number | null; lengthCm: number | null; headCm: number | null; isCheckup: boolean; notes: string | null };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className={babyButton}>
            <Ruler className="size-4" /> Nueva medición
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaults ? "Editar medición" : "Nueva medición"}</DialogTitle>
          <DialogDescription>Copiá los datos del control o de la libreta. Podés cargar solo lo que tengas.</DialogDescription>
        </DialogHeader>
        <ActionForm action={saveMeasurement} className="grid grid-cols-2 gap-3" onDone={() => setOpen(false)}>
          <Field label="Fecha" htmlFor={`${id}-date`} className="col-span-2">
            <Input id={`${id}-date`} type="date" name="date" defaultValue={defaults?.date ?? today} max={today} required />
          </Field>
          <Field label="Peso (kg)" htmlFor={`${id}-w`} hint="Ej: 7,25 o 7250 g">
            <Input id={`${id}-w`} name="weightKg" inputMode="decimal" defaultValue={defaults?.weightKg ?? ""} autoFocus />
          </Field>
          <Field label="Talla (cm)" htmlFor={`${id}-l`}>
            <Input id={`${id}-l`} name="lengthCm" inputMode="decimal" defaultValue={defaults?.lengthCm ?? ""} />
          </Field>
          <Field label="Perímetro cefálico (cm)" htmlFor={`${id}-h`} className="col-span-2">
            <Input id={`${id}-h`} name="headCm" inputMode="decimal" defaultValue={defaults?.headCm ?? ""} />
          </Field>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="isCheckup" defaultChecked={defaults?.isCheckup ?? true} className="size-4 accent-[var(--baby)]" />
            Fue un control con el pediatra
          </label>
          <Field label="Notas del control" htmlFor={`${id}-n`} className="col-span-2">
            <Textarea id={`${id}-n`} name="notes" rows={2} defaultValue={defaults?.notes ?? ""} placeholder="Indicaciones, próximo control, suplementos…" />
          </Field>
          <SubmitButton className={`col-span-2 ${babyButton}`}>Guardar</SubmitButton>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

/** Botón para marcar una dosis como aplicada (hoy o en otra fecha). */
export function MarkVaccineButton({ code, today, defaultDate }: { code: string; today: string; defaultDate?: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate && defaultDate < today ? defaultDate : today);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const res = await markVaccine(code, date);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setOpen(false);
    });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="xs" variant="outline">
          <Syringe className="size-3" /> Aplicada
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2">
        <div className="text-sm font-medium">¿Cuándo se la dieron?</div>
        <Input type="date" aria-label="Fecha de aplicación" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        <Button size="sm" className={`w-full ${babyButton}`} disabled={pending || !date} onClick={save}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Guardar
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function ExtraVaccineDialog({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-3.5" /> Otra vacuna
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vacuna fuera del calendario</DialogTitle>
          <DialogDescription>Por ejemplo, las que indica el pediatra y no están en el calendario oficial.</DialogDescription>
        </DialogHeader>
        <ActionForm action={addExtraVaccine} className="grid gap-3" onDone={() => setOpen(false)}>
          <Field label="Vacuna" htmlFor="extra-vaccine-name">
            <Input id="extra-vaccine-name" name="name" required placeholder="Ej: Meningococo B (1ª dosis)" autoFocus />
          </Field>
          <Field label="Fecha" htmlFor="extra-vaccine-date">
            <Input id="extra-vaccine-date" type="date" name="date" defaultValue={today} max={today} required />
          </Field>
          <Field label="Notas" htmlFor="extra-vaccine-notes">
            <Input id="extra-vaccine-notes" name="notes" placeholder="Lote, vacunatorio, reacción…" />
          </Field>
          <SubmitButton className={babyButton}>Guardar</SubmitButton>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
