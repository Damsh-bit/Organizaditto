"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ActionButton } from "@/components/action-button";
import { Field, NativeSelect } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteProgressPhoto, uploadProgressPhoto } from "@/app/actions/training";
import { daysBetween, fmtDate, fmtDateShort } from "@/lib/dates";
import { fmtDec } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PhotoMeta = { id: number; date: string; pose: string; width: number | null; height: number | null };
type WeightPoint = { date: string; weightKg: number };

const POSES = [
  { key: "frente", label: "Frente" },
  { key: "perfil", label: "Perfil" },
  { key: "espalda", label: "Espalda" },
] as const;

const src = (id: number) => `/api/fotos/${id}`;

/** Achica la foto en el navegador (lado mayor 1080 px, JPEG) respetando la orientación de la cámara. */
async function resizeImage(file: File, max = 1080, quality = 0.82) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la foto"))), "image/jpeg", quality),
  );
  return { blob, width, height };
}

/** Peso del mismo día o el más cercano (hasta 4 días de diferencia). */
function weightNear(weights: WeightPoint[], date: string) {
  let best: WeightPoint | null = null;
  for (const w of weights) {
    const d = Math.abs(daysBetween(w.date, date));
    if (d <= 4 && (!best || d < Math.abs(daysBetween(best.date, date)))) best = w;
  }
  return best;
}

function UploadDialog({ today, photos }: { today: string; photos: PhotoMeta[] }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [pose, setPose] = useState<string>("frente");
  const [img, setImg] = useState<{ blob: Blob; width: number; height: number; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const doneToday = new Set(photos.filter((p) => p.date === date).map((p) => p.pose));

  useEffect(() => () => void (img && URL.revokeObjectURL(img.url)), [img]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await resizeImage(file);
      setImg({ ...r, url: URL.createObjectURL(r.blob) });
    } catch {
      toast.error("No pude leer esa imagen. Probá con otra (JPG o PNG).");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!img) return;
    const fd = new FormData();
    fd.set("photo", img.blob, "foto.jpg");
    fd.set("date", date);
    fd.set("pose", pose);
    fd.set("width", String(img.width));
    fd.set("height", String(img.height));
    start(async () => {
      const res = await uploadProgressPhoto(fd);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setImg(null);
      // Sugerir la próxima pose que falta para ese día
      const next = POSES.find((p) => p.key !== pose && !doneToday.has(p.key));
      if (next) setPose(next.key);
      else setOpen(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setImg(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Camera className="size-4" /> Agregar fotos
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Foto de progreso</DialogTitle>
          <DialogDescription>Mismo lugar, misma luz y a la misma hora (ideal: el día del pesaje, en ayunas). Se guardan solo en tu base.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Fecha" htmlFor="photo-date">
            <Input id="photo-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Pose">
            {POSES.map((p) => (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={pose === p.key}
                onClick={() => setPose(p.key)}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors",
                  pose === p.key ? "border-gym bg-gym/10" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {p.label}
                {doneToday.has(p.key) && " ✓"}
              </button>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              void pick(file);
            }}
          />
          {img ? (
            <div className="relative mx-auto aspect-[3/4] w-full max-w-60 overflow-hidden rounded-xl border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob) */}
              <img src={img.url} alt="Vista previa" className="size-full object-cover" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mx-auto flex aspect-[3/4] w-full max-w-60 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground hover:bg-muted/50"
            >
              {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
              Sacar o elegir foto
            </button>
          )}
          <div className="flex gap-2">
            {img && (
              <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
                Cambiar
              </Button>
            )}
            <Button className="flex-1 bg-gym text-white hover:bg-gym/90 dark:text-neutral-950" disabled={!img || pending} onClick={save}>
              {pending && <Loader2 className="size-4 animate-spin" />} Guardar {POSES.find((p) => p.key === pose)?.label.toLowerCase()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PhotoThumb({ photo, label }: { photo: PhotoMeta; label: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="group relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted" aria-label={`Ver foto ${label}`}>
          <Image src={src(photo.id)} alt={label} fill unoptimized sizes="160px" className="object-cover transition-transform group-hover:scale-105" />
          <span className="absolute inset-x-0 bottom-0 bg-black/45 px-1.5 py-0.5 text-[11px] text-white">{label}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {label} · {fmtDate(photo.date)}
          </DialogTitle>
          <DialogDescription className="sr-only">Foto de progreso</DialogDescription>
        </DialogHeader>
        <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-xl bg-muted">
          <Image src={src(photo.id)} alt={label} fill unoptimized sizes="512px" className="object-contain" />
        </div>
        <ActionButton
          variant="ghost"
          className="text-destructive"
          action={deleteProgressPhoto.bind(null, photo.id)}
          confirm="¿Eliminar esta foto?"
        >
          <Trash2 className="size-4" /> Eliminar foto
        </ActionButton>
      </DialogContent>
    </Dialog>
  );
}

function Compare({ photos, weights }: { photos: PhotoMeta[]; weights: WeightPoint[] }) {
  const dates = useMemo(() => [...new Set(photos.map((p) => p.date))].sort(), [photos]);
  const [pose, setPose] = useState("frente");
  const [from, setFrom] = useState(dates[0]);
  const [to, setTo] = useState(dates.at(-1)!);
  const a = photos.find((p) => p.date === from && p.pose === pose);
  const b = photos.find((p) => p.date === to && p.pose === pose);
  const wa = weightNear(weights, from);
  const wb = weightNear(weights, to);
  const diff = wa && wb ? wb.weightKg - wa.weightKg : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Field label="Antes" htmlFor="cmp-from">
          <NativeSelect id="cmp-from" value={from} onChange={(e) => setFrom(e.target.value)}>
            {dates.map((d) => (
              <option key={d} value={d}>
                {fmtDateShort(d)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Después" htmlFor="cmp-to">
          <NativeSelect id="cmp-to" value={to} onChange={(e) => setTo(e.target.value)}>
            {dates.map((d) => (
              <option key={d} value={d}>
                {fmtDateShort(d)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Pose" htmlFor="cmp-pose">
          <NativeSelect id="cmp-pose" value={pose} onChange={(e) => setPose(e.target.value)}>
            {POSES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { p: a, d: from, w: wa },
          { p: b, d: to, w: wb },
        ].map(({ p, d, w }, i) => (
          <div key={i} className="space-y-1">
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl border bg-muted">
              {p ? (
                <Image src={src(p.id)} alt={`${pose} ${d}`} fill unoptimized sizes="(max-width: 768px) 50vw, 300px" className="object-cover" />
              ) : (
                <div className="grid size-full place-items-center p-3 text-center text-xs text-muted-foreground">Sin foto de {pose} ese día</div>
              )}
            </div>
            <div className="text-center text-xs text-muted-foreground">
              <span className="capitalize">{fmtDateShort(d)}</span>
              {w && <span className="tabular"> · {fmtDec(w.weightKg, 1)} kg</span>}
            </div>
          </div>
        ))}
      </div>
      {diff != null && from !== to && (
        <p className="text-center text-sm">
          <span className={cn("font-semibold tabular", diff < 0 ? "text-success" : diff > 0 ? "text-warning" : "")}>
            {diff > 0 ? "+" : ""}
            {fmtDec(diff, 1)} kg
          </span>{" "}
          en {daysBetween(from, to)} días
        </p>
      )}
    </div>
  );
}

export function ProgressPhotos({ photos, weights, today }: { photos: PhotoMeta[]; weights: WeightPoint[]; today: string }) {
  const byDate = new Map<string, PhotoMeta[]>();
  for (const p of photos) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);
  const order = (pose: string) => POSES.findIndex((p) => p.key === pose);
  const canCompare = byDate.size >= 2;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {photos.length ? `${photos.length} fotos en ${byDate.size} ${byDate.size === 1 ? "día" : "días"}.` : "Cuando la balanza se estanca, las fotos muestran el cambio."}
        </p>
        <UploadDialog today={today} photos={photos} />
      </div>
      {canCompare && <Compare photos={photos} weights={weights} />}
      {[...byDate.entries()].map(([date, list]) => {
        const w = weightNear(weights, date);
        return (
          <div key={date} className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground first-letter:uppercase">
              {fmtDate(date, "EEEE d 'de' MMMM yyyy")}
              {w && <span className="tabular"> · {fmtDec(w.weightKg, 1)} kg</span>}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[...list]
                .sort((x, y) => order(x.pose) - order(y.pose))
                .map((p) => (
                  <PhotoThumb key={p.id} photo={p} label={POSES.find((x) => x.key === p.pose)?.label ?? p.pose} />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
