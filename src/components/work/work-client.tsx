"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeftRight, Loader2, Play, Plus, Square, X } from "lucide-react";
import { toast } from "sonner";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, NativeSelect } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cancelWorkTimer, quickAddHours, saveWorkLog, savePayout, startWorkTimer, stopWorkTimer } from "@/app/actions/work";
import type { ActionResult } from "@/lib/action-result";
import { fmtARS, fmtDec, fmtUSD, parseNum } from "@/lib/format";

function useRun() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else if (res.message) toast.success(res.message);
    });
  return [pending, run] as const;
}

/* ------------------------------ Cronómetro de jornada ------------------------------ */

export function WorkTimer({
  running,
  hourlyRate,
  arsRate,
  projects,
}: {
  running: { id: number; startedAt: string; project: string | null; rateUsd: number } | null;
  hourlyRate: number;
  arsRate: number;
  projects: string[];
}) {
  const [now, setNow] = useState(() => Date.now());
  const [project, setProject] = useState("");
  const [pending, run] = useRun();

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!running) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Proyecto / cliente (opcional)" className="flex-1">
          <Input value={project} onChange={(e) => setProject(e.target.value)} list="work-projects" placeholder="Ej: Cliente X" />
          <datalist id="work-projects">
            {projects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Button size="lg" className="bg-work text-white hover:bg-work/90" disabled={pending} onClick={() => run(() => startWorkTimer(project))}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Empezar jornada
        </Button>
      </div>
    );
  }

  const elapsedMs = Math.max(0, now - new Date(running.startedAt).getTime());
  const hours = elapsedMs / 3_600_000;
  const h = Math.floor(elapsedMs / 3_600_000);
  const m = Math.floor((elapsedMs % 3_600_000) / 60_000);
  const s = Math.floor((elapsedMs % 60_000) / 1000);
  const usd = hours * running.rateUsd;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-work opacity-60" />
          <span className="relative inline-flex size-3 rounded-full bg-work" />
        </span>
        <div>
          <div className="text-4xl font-semibold tracking-tight tabular">
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </div>
          <div className="text-sm text-muted-foreground">
            {running.project ? `${running.project} · ` : ""}
            {fmtUSD(usd)} · {fmtARS(usd * arsRate)}
          </div>
        </div>
      </div>
      <div className="flex gap-2 sm:ml-auto">
        <Button variant="ghost" size="icon" disabled={pending} onClick={() => confirm("¿Descartar esta jornada?") && run(() => cancelWorkTimer(running.id))} aria-label="Descartar">
          <X className="size-4" />
        </Button>
        <Button size="lg" variant="destructive" disabled={pending} onClick={() => run(() => stopWorkTimer(running.id))}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />} Terminar jornada
        </Button>
      </div>
      <span className="sr-only">Tarifa {fmtUSD(hourlyRate)} por hora</span>
    </div>
  );
}

/* ------------------------------ Carga rápida ------------------------------ */

export function QuickHours({ date }: { date: string }) {
  const [pending, run] = useRun();
  return (
    <div className="flex flex-wrap gap-1.5">
      {[0.5, 1, 2, 4, 6, 8].map((h) => (
        <Button key={h} variant="outline" size="sm" disabled={pending} onClick={() => run(() => quickAddHours(date, h))}>
          +{fmtDec(h, 1)} h
        </Button>
      ))}
    </div>
  );
}

/* ------------------------------ Registro manual ------------------------------ */

export function WorkLogDialog({
  defaults,
  projects,
  trigger,
}: {
  defaults: { id?: number; date: string; hours?: number | null; project?: string | null; description?: string | null };
  projects: string[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"horas" | "horario">("horas");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Plus className="size-4" /> Cargar horas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaults.id ? "Editar registro" : "Cargar horas trabajadas"}</DialogTitle>
          <DialogDescription>Podés poner el total de horas o el horario de inicio y fin.</DialogDescription>
        </DialogHeader>
        <ActionForm action={saveWorkLog} className="grid grid-cols-2 gap-3" onDone={() => setOpen(false)}>
          {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
          <Field label="Fecha" className="col-span-2">
            <Input type="date" name="date" defaultValue={defaults.date} required />
          </Field>
          <div className="col-span-2 flex rounded-lg border p-0.5 text-sm">
            {(["horas", "horario"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-1 ${mode === m ? "bg-muted font-medium" : "text-muted-foreground"}`}
              >
                {m === "horas" ? "Total de horas" : "Desde / hasta"}
              </button>
            ))}
          </div>
          {mode === "horas" ? (
            <Field label="Horas" className="col-span-2" hint="Ej: 7,5 = siete horas y media">
              <Input name="hours" inputMode="decimal" defaultValue={defaults.hours ?? ""} autoFocus />
            </Field>
          ) : (
            <>
              <Field label="Desde">
                <Input type="time" name="start" />
              </Field>
              <Field label="Hasta">
                <Input type="time" name="end" />
              </Field>
            </>
          )}
          <Field label="Proyecto / cliente" className="col-span-2">
            <Input name="project" list="work-projects-dialog" defaultValue={defaults.project ?? ""} />
            <datalist id="work-projects-dialog">
              {projects.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="¿Qué hiciste? (opcional)" className="col-span-2">
            <Input name="description" defaultValue={defaults.description ?? ""} />
          </Field>
          <SubmitButton className="col-span-2 bg-work text-white hover:bg-work/90">Guardar</SubmitButton>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Cobros ------------------------------ */

export function PayoutDialog({ today, rate, pendingUsd }: { today: string; rate: number; pendingUsd: number }) {
  const [open, setOpen] = useState(false);
  const [usd, setUsd] = useState(pendingUsd > 0 ? fmtDec(pendingUsd, 2).replace(/\./g, "") : "");
  const [r, setR] = useState(String(rate));
  const ars = (parseNum(usd) ?? 0) * (parseNum(r) ?? 0);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-work text-white hover:bg-work/90">
          <Plus className="size-4" /> Registrar cobro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar cobro / retiro</DialogTitle>
          <DialogDescription>Cuando cobrás o pasás dólares a pesos (por ejemplo en Wallbit).</DialogDescription>
        </DialogHeader>
        <ActionForm action={savePayout} className="grid grid-cols-2 gap-3" onDone={() => setOpen(false)}>
          <Field label="Fecha">
            <Input type="date" name="date" defaultValue={today} required />
          </Field>
          <Field label="Medio">
            <NativeSelect name="method" defaultValue="wallbit">
              <option value="wallbit">Wallbit</option>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="otro">Otro</option>
            </NativeSelect>
          </Field>
          <Field label="Monto (USD)">
            <Input name="amountUsd" inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value)} required />
          </Field>
          <Field label="Cotización ($ por USD)">
            <Input name="arsRate" inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} />
          </Field>
          <div className="col-span-2 rounded-lg bg-work/10 px-3 py-2 text-sm">
            Recibís ≈ <span className="font-semibold">{fmtARS(ars)}</span>
          </div>
          <Field label="Nota" className="col-span-2">
            <Input name="notes" />
          </Field>
          <SubmitButton className="col-span-2 bg-work text-white hover:bg-work/90">Guardar</SubmitButton>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Conversor ------------------------------ */

export function Converter({ rates }: { rates: { label: string; value: number }[] }) {
  const [usd, setUsd] = useState("100");
  const [ars, setArs] = useState("");
  const [idx, setIdx] = useState(0);
  const rate = rates[idx]?.value ?? 0;
  return (
    <div className="space-y-3">
      <NativeSelect
        value={idx}
        onChange={(e) => {
          setIdx(Number(e.target.value));
          setArs("");
        }}
      >
        {rates.map((r, i) => (
          <option key={r.label} value={i}>
            {r.label} · {fmtARS(r.value, 2)}
          </option>
        ))}
      </NativeSelect>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Field label="Dólares (USD)">
          <Input
            inputMode="decimal"
            value={usd}
            onChange={(e) => {
              setUsd(e.target.value);
              const v = parseNum(e.target.value);
              setArs(v != null ? fmtDec(v * rate, 2) : "");
            }}
          />
        </Field>
        <ArrowLeftRight className="mb-2.5 size-4 text-muted-foreground" />
        <Field label="Pesos (ARS)">
          <Input
            inputMode="decimal"
            value={ars || (parseNum(usd) != null ? fmtDec((parseNum(usd) ?? 0) * rate, 2) : "")}
            onChange={(e) => {
              setArs(e.target.value);
              const v = parseNum(e.target.value);
              setUsd(v != null && rate ? fmtDec(v / rate, 2) : "");
            }}
          />
        </Field>
      </div>
    </div>
  );
}
