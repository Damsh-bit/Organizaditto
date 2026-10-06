import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RecipeEditor } from "@/components/nutrition/recipe-editor";
import { getFoodOptions } from "@/lib/data/nutrition";
import { emptyRecipe } from "@/lib/recipes";

export const metadata: Metadata = { title: "Nueva receta para el bebé" };

export default async function NewBabyRecipePage() {
  const foods = await getFoodOptions();
  return (
    <div>
      <PageHeader title="Nueva receta para el bebé" description="Recordá: sin sal, sin azúcar y sin miel antes del año." />
      <RecipeEditor initial={emptyRecipe("baby")} foods={foods} basePath="/bebe/recetas" />
    </div>
  );
}
