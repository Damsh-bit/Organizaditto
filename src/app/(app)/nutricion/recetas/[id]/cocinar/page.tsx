import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CookMode } from "@/components/nutrition/cook-mode";
import { getRecipeFull } from "@/lib/data/nutrition";

export const metadata: Metadata = { title: "Modo cocina" };

export default async function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const recipe = await getRecipeFull(Number((await params).id));
  if (!recipe) notFound();
  const base = recipe.audience === "baby" ? "/bebe/recetas" : "/nutricion/recetas";
  return (
    <CookMode
      name={recipe.name}
      emoji={recipe.emoji}
      steps={recipe.steps}
      backHref={`${base}/${recipe.id}`}
      ingredients={recipe.ingredients.map((i) => ({
        id: i.id,
        grams: i.grams,
        note: i.note,
        food: { name: i.food.name, unitName: i.food.unitName, unitGrams: i.food.unitGrams },
      }))}
    />
  );
}
