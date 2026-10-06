"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({ text, label = "Copiar", message = "Copiado al portapapeles" }: { text: string; label?: string; message?: string }) {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success(message);
        } catch {
          toast.error("No se pudo copiar");
        }
      }}
    >
      <Copy className="size-4" /> {label}
    </Button>
  );
}
