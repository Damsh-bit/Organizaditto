import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeDetail } from "@/components/nutrition/recipe-detail";
import { getRecipeFull } from "@/lib/data/nutrition";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getRecipeFull(Number((await params).id));
  return { title: recipe?.name ?? "Receta" };
}

export default async function RecipePage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const recipe = await getRecipeFull(id);
  if (!recipe) notFound();
  return <RecipeDetail recipe={recipe} basePath={recipe.audience === "baby" ? "/bebe/recetas" : "/nutricion/recetas"} />;
}
