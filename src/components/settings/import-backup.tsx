"use client";

import { useRef, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { importBackup } from "@/app/actions/settings";

export function ImportBackup() {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (!window.confirm("Esto REEMPLAZA todos tus datos actuales por los del backup. ¿Continuar?")) return;
          const fd = new FormData();
          fd.set("file", file);
          start(async () => {
            const res = await importBackup(fd);
            if (!res.ok) toast.error(res.error);
            else toast.success(res.message);
          });
        }}
      />
      <Button variant="outline" disabled={pending} onClick={() => ref.current?.click()}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Restaurar backup
      </Button>
    </>
  );
}
