"use client";

import { createContext, useContext, useRef, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

const PendingCtx = createContext(false);

type Props = {
  action: (fd: FormData) => Promise<ActionResult<unknown> | void>;
  children: React.ReactNode;
  className?: string;
  success?: string;
  resetOnSuccess?: boolean;
  onDone?: (result: ActionResult<unknown> | void) => void;
};

/** Formulario que llama a una server action, muestra toasts y estado de carga. */
export function ActionForm({ action, children, className, success, resetOnSuccess, onDone }: Props) {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <PendingCtx.Provider value={pending}>
      <form
        ref={ref}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            try {
              const res = await action(fd);
              if (res && !res.ok) {
                toast.error(res.error);
                return;
              }
              const msg = (res && res.ok && res.message) || success;
              if (msg) toast.success(msg);
              if (resetOnSuccess) ref.current?.reset();
              onDone?.(res);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "No se pudo guardar");
            }
          });
        }}
      >
        {children}
      </form>
    </PendingCtx.Provider>
  );
}

export function SubmitButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  const pending = useContext(PendingCtx);
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

export function usePendingForm() {
  return useContext(PendingCtx);
}
