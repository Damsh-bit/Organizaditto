"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="text-4xl">😵‍💫</div>
      <h2 className="text-lg font-semibold">Algo salió mal</h2>
      <p className="max-w-md text-sm text-muted-foreground">{error.message || "Error inesperado."}</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
