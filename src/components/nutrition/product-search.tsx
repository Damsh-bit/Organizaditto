"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Barcode, Globe, Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { importProduct, searchProducts } from "@/app/actions/nutrition";
import type { FoodOption } from "@/lib/data/nutrition";
import type { OffProduct } from "@/lib/server/off";
import { fmtDec, fmtInt } from "@/lib/format";

const noop = () => () => {};

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

function hasBarcodeDetector() {
  return typeof window !== "undefined" && "BarcodeDetector" in window && Boolean(navigator.mediaDevices?.getUserMedia);
}

/** Buscador de productos envasados en Open Food Facts (nombre o código de barras). */
export function ProductSearch({ onImported, autoFocus }: { onImported?: (food: FoodOption) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<OffProduct[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [importing, setImporting] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const canScan = useSyncExternalStore(noop, hasBarcodeDetector, () => false);

  const search = (query = q) =>
    startSearch(async () => {
      const res = await searchProducts(query);
      if (!res.ok) {
        setResults([]);
        toast.error(res.error);
        return;
      }
      setResults(res.data ?? []);
    });

  return (
    <div className="space-y-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Marca o producto, o código de barras" className="pl-8" autoFocus={autoFocus} />
        </div>
        {canScan && (
          <Button type="button" variant="outline" size="icon" onClick={() => setScanning(true)} aria-label="Escanear código de barras">
            <Barcode className="size-4" />
          </Button>
        )}
        <Button type="submit" disabled={searching}>
          {searching ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />} Buscar
        </Button>
      </form>
      {scanning && (
        <Scanner
          onClose={() => setScanning(false)}
          onCode={(code) => {
            setScanning(false);
            setQ(code);
            search(code);
          }}
        />
      )}
      <div className="max-h-[45dvh] space-y-1 overflow-y-auto">
        {results?.map((p) => (
          <div key={p.code || p.name} className="flex items-center gap-2 rounded-lg border px-2 py-2">
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm leading-tight">
                {p.name}
                {p.brand && <span className="text-muted-foreground"> · {p.brand}</span>}
              </div>
              <div className="text-[11px] text-muted-foreground tabular">
                {fmtInt(p.kcal)} kcal · P {fmtDec(p.protein)} · C {fmtDec(p.carbs)} · G {fmtDec(p.fat)} cada 100 g{p.quantity ? ` · ${p.quantity}` : ""}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={importing !== null}
              onClick={async () => {
                setImporting(p.code || p.name);
                const res = await importProduct(p);
                setImporting(null);
                if (!res.ok) return void toast.error(res.error);
                toast.success(res.message);
                if (res.data) onImported?.(res.data);
              }}
            >
              {importing === (p.code || p.name) ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Usar
            </Button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Datos de Open Food Facts (base colaborativa): revisá que los valores coincidan con la etiqueta.</p>
    </div>
  );
}

function Scanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const cb = useRef(onCode);
  useEffect(() => {
    cb.current = onCode;
  }, [onCode]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        const detector = new Ctor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            const codes = await detector.detect(video.current);
            if (codes[0]?.rawValue) {
              cb.current(codes[0].rawValue);
              return;
            }
          } catch {
            /* frame no listo */
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setError("No pude acceder a la cámara. Revisá los permisos (requiere https).");
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border bg-black">
      {error ? (
        <p className="p-4 text-sm text-white">{error}</p>
      ) : (
        <video ref={video} className="aspect-video w-full object-cover" muted playsInline />
      )}
      <div className="pointer-events-none absolute inset-x-10 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
      <Button size="icon-sm" variant="secondary" className="absolute top-2 right-2" onClick={onClose} aria-label="Cerrar escáner">
        <X className="size-4" />
      </Button>
    </div>
  );
}

/** Diálogo para la página de Alimentos. */
export function ProductSearchDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Globe className="size-4" /> Buscar producto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar producto envasado</DialogTitle>
          <DialogDescription>Buscá por nombre/marca o escaneá el código de barras para traer sus calorías y macros.</DialogDescription>
        </DialogHeader>
        <ProductSearch autoFocus />
      </DialogContent>
    </Dialog>
  );
}
