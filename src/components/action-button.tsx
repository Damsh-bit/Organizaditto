"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

type Props = Omit<React.ComponentProps<typeof Button>, "onClick" | "action"> & {
  action: () => Promise<ActionResult<unknown> | void>;
  confirm?: string;
  success?: string;
  onDone?: () => void;
  /** Navegar a esta ruta después de una ejecución exitosa. */
  redirectTo?: string;
};

/** Botón que ejecuta una server action (ya con sus argumentos bindeados). */
export function ActionButton({ action, confirm, success, onDone, redirectTo, children, disabled, ...props }: Props) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      {...props}
      disabled={pending || disabled}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          try {
            const res = await action();
            if (res && !res.ok) return void toast.error(res.error);
            const msg = (res && res.ok && res.message) || success;
            if (msg) toast.success(msg);
            onDone?.();
            if (redirectTo) router.push(redirectTo);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error");
          }
        });
      }}
    >
      {pending && props.size?.toString().startsWith("icon") ? <Loader2 className="size-4 animate-spin" /> : children}
      {pending && !props.size?.toString().startsWith("icon") && <Loader2 className="size-3.5 animate-spin" />}
    </Button>
  );
}
