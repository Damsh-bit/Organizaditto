import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RecipeEditor } from "@/components/nutrition/recipe-editor";
import { getFoodOptions } from "@/lib/data/nutrition";
import { emptyRecipe } from "@/lib/recipes";

export const metadata: Metadata = { title: "Nueva receta" };

export default async function NewRecipePage() {
  const foods = await getFoodOptions();
  return (
    <div>
      <PageHeader title="Nueva receta" description="Cargá los ingredientes en gramos y las calorías se calculan solas." />
      <RecipeEditor initial={emptyRecipe("adult")} foods={foods} basePath="/nutricion/recetas" />
    </div>
  );
}
