"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyMenuTemplate } from "@/app/actions/nutrition";

export function ApplyMenuButtons({
  templateId,
  thisWeek,
  nextWeek,
  planPath = "/nutricion/plan",
}: {
  templateId: number;
  thisWeek: string;
  nextWeek: string;
  planPath?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const apply = (weekStart: string) =>
    start(async () => {
      const res = await applyMenuTemplate({ templateId, weekStart, scale: true, replace: true });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.push(`${planPath}?semana=${weekStart}`);
    });
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => apply(thisWeek)} disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarCheck className="size-3.5" />} Usar esta semana
      </Button>
      <Button size="sm" variant="outline" onClick={() => apply(nextWeek)} disabled={pending}>
        Usar la próxima
      </Button>
    </div>
  );
}
