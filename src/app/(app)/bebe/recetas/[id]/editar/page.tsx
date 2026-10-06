import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RecipeEditor } from "@/components/nutrition/recipe-editor";
import { getFoodOptions, getRecipeFull } from "@/lib/data/nutrition";
import { recipeToEditor } from "@/lib/recipes";

export const metadata: Metadata = { title: "Editar receta" };

export default async function EditBabyRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const [recipe, foods] = await Promise.all([getRecipeFull(Number((await params).id)), getFoodOptions()]);
  if (!recipe) notFound();
  return (
    <div>
      <PageHeader title="Editar receta" emoji={recipe.emoji ?? undefined} description={recipe.name} />
      <RecipeEditor initial={recipeToEditor(recipe)} foods={foods} basePath="/bebe/recetas" />
    </div>
  );
}
