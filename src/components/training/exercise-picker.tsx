"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createExercise } from "@/app/actions/training";
import { matches } from "@/lib/search";

export type ExerciseOpt = { id: number; name: string; muscleGroup: string; kind: string; equipment: string | null };

export function ExercisePicker({
  exercises,
  onPick,
  label = "Agregar ejercicio",
}: {
  exercises: ExerciseOpt[];
  onPick: (ex: ExerciseOpt) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const groups = [...new Set(exercises.map((e) => e.muscleGroup))];

  async function createNew() {
    const fd = new FormData();
    fd.set("name", search.trim());
    fd.set("kind", "fuerza");
    const res = await createExercise(fd);
    if (!res.ok) return void toast.error(res.error);
    onPick({ id: res.data!.id, name: search.trim(), muscleGroup: "general", kind: "fuerza", equipment: null });
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full border-dashed">
          <Plus className="size-4" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,24rem)] p-0" align="start">
        <Command filter={(v, s) => (matches(v, s) ? 1 : 0)}>
          <CommandInput placeholder="Buscar ejercicio…" value={search} onValueChange={setSearch} />
          <CommandList className="max-h-80">
            <CommandEmpty>
              {search.trim() ? (
                <button type="button" onClick={createNew} className="mx-auto flex items-center gap-1 text-sm text-primary hover:underline">
                  <Plus className="size-3.5" /> Crear “{search.trim()}”
                </button>
              ) : (
                "Sin resultados"
              )}
            </CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g} heading={g}>
                {exercises
                  .filter((e) => e.muscleGroup === g)
                  .map((e) => (
                    <CommandItem
                      key={e.id}
                      value={`${e.name} ${e.muscleGroup} ${e.equipment ?? ""} #${e.id}`}
                      onSelect={() => {
                        onPick(e);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <span className="flex-1">{e.name}</span>
                      {e.equipment && <span className="text-xs text-muted-foreground">{e.equipment}</span>}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
