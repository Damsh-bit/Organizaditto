import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RecipeBrowser } from "@/components/nutrition/recipe-browser";
import { Button } from "@/components/ui/button";
import { getBabyContext } from "@/lib/data/baby";
import { listRecipes } from "@/lib/data/nutrition";
import { toRecipeCard } from "@/lib/recipes";

export const metadata: Metadata = { title: "Recetas para el bebé" };

export default async function BabyRecipesPage() {
  const [recipes, { baby, months }] = await Promise.all([listRecipes("baby"), getBabyContext()]);
  return (
    <div>
      <PageHeader
        title="Recetas para el bebé"
        description="Sin sal ni azúcar, con la textura y la edad recomendada de cada una. Purés, papillas y BLW."
        actions={
          <Button asChild className="bg-baby text-white dark:text-neutral-950 hover:bg-baby/90">
            <Link href="/bebe/recetas/nueva">
              <Plus className="size-4" /> Nueva receta
            </Link>
          </Button>
        }
      />
      <RecipeBrowser recipes={recipes.map(toRecipeCard)} basePath="/bebe/recetas" mode="baby" babyMonths={baby ? months : null} />
    </div>
  );
}
