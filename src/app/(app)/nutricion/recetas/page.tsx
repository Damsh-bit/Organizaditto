import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RecipeBrowser } from "@/components/nutrition/recipe-browser";
import { Button } from "@/components/ui/button";
import { listRecipes } from "@/lib/data/nutrition";
import { toRecipeCard } from "@/lib/recipes";

export const metadata: Metadata = { title: "Recetas" };

export default async function RecetasPage() {
  const recipes = await listRecipes("adult");
  return (
    <div>
      <PageHeader
        title="Recetas"
        description="Recetas pensadas para el déficit: porciones medidas, mucha proteína y verdura. Calorías calculadas por porción."
        actions={
          <Button asChild>
            <Link href="/nutricion/recetas/nueva">
              <Plus className="size-4" /> Nueva receta
            </Link>
          </Button>
        }
      />
      <RecipeBrowser recipes={recipes.map(toRecipeCard)} basePath="/nutricion/recetas" />
    </div>
  );
}
