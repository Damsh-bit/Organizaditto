"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FOOD_CATEGORIES } from "@/lib/constants";
import { fmtInt } from "@/lib/format";
import { matches } from "@/lib/search";
import { cn } from "@/lib/utils";

export type PickerFood = { id: number; name: string; category: string; kcal: number };

export function FoodPicker({
  foods,
  value,
  onChange,
  placeholder = "Elegí un alimento…",
  className,
}: {
  foods: PickerFood[];
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = foods.find((f) => f.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn("w-full justify-between font-normal", className)}>
          <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.name ?? placeholder}</span>
          <ChevronsUpDown className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,22rem)] p-0" align="start">
        <Command filter={(v, search) => (matches(v, search) ? 1 : 0)}>
          <CommandInput placeholder="Buscar alimento…" />
          <CommandList className="max-h-72">
            <CommandEmpty>No encontrado. Podés crearlo en Alimentos.</CommandEmpty>
            <CommandGroup>
              {foods.map((f) => (
                <CommandItem
                  key={f.id}
                  value={`${f.name} ${FOOD_CATEGORIES[f.category] ?? ""} #${f.id}`}
                  onSelect={() => {
                    onChange(f.id);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground tabular">{fmtInt(f.kcal)} kcal</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
