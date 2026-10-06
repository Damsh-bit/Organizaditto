import Link from "next/link";
import { ChevronRight, Clock, Flame } from "lucide-react";
import { fmtDateShort } from "@/lib/dates";
import { fmtInt } from "@/lib/format";
import { WORKOUT_TYPES } from "@/lib/training";

type W = {
  id: number;
  date: string;
  type: string;
  title: string | null;
  durationMin: number;
  intensity: string;
  kcalBurned: number;
  routine?: { name: string } | null;
  sets: { exerciseId: number }[];
};

export function WorkoutListItem({ workout: w }: { workout: W }) {
  const t = WORKOUT_TYPES[w.type] ?? WORKOUT_TYPES.otro;
  const exercisesCount = new Set(w.sets.map((s) => s.exerciseId)).size;
  return (
    <Link href={`/entrenamiento/${w.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gym/12 text-xl">{t.emoji}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{w.title || w.routine?.name || t.label}</div>
        <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span className="capitalize">{fmtDateShort(w.date)}</span>
          <span className="flex items-center gap-0.5">
            <Clock className="size-3" /> {w.durationMin} min
          </span>
          <span className="flex items-center gap-0.5">
            <Flame className="size-3" /> {fmtInt(w.kcalBurned)} kcal
          </span>
          {exercisesCount > 0 && <span>{exercisesCount} ejercicios · {w.sets.length} series</span>}
        </div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
