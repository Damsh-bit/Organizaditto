import Link from "next/link";
import { ArrowLeft, ChefHat, Clock, Lightbulb, Refrigerator, Star, Trash2, Users } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Pill } from "@/components/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { archiveRecipe, toggleFavoriteRecipe } from "@/app/actions/nutrition";
import { ALLERGENS, MEAL_LABEL } from "@/lib/constants";
import { fmtDec, fmtInt } from "@/lib/format";
import type { RecipeFull } from "@/lib/data/nutrition";
import { IngredientScaler, RecipeActions } from "./recipe-client";

export function RecipeDetail({ recipe, basePath }: { recipe: RecipeFull; basePath: string }) {
  const baby = recipe.audience === "baby";
  const totalMin = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const allergens = [...new Set(recipe.ingredients.map((i) => i.food.allergen).filter(Boolean))] as string[];

  return (
    <div className="space-y-5">
      <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Recetas
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-muted text-5xl">{recipe.emoji ?? "🍽️"}</div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-2">
            <h1 className="flex-1 text-2xl font-semibold tracking-tight md:text-3xl">{recipe.name}</h1>
            <ActionButton
              variant="ghost"
              size="icon"
              action={toggleFavoriteRecipe.bind(null, recipe.id)}
              aria-label={recipe.isFavorite ? "Quitar de favoritas" : "Marcar como favorita"}
            >
              <Star className={recipe.isFavorite ? "size-5 fill-amber-400 text-amber-400" : "size-5"} />
            </ActionButton>
          </div>
          {recipe.description && <p className="text-muted-foreground">{recipe.description}</p>}
          <div className="flex flex-wrap gap-1.5">
            {recipe.mealTypes.map((m) => (
              <Pill key={m}>{MEAL_LABEL[m] ?? m}</Pill>
            ))}
            {totalMin > 0 && (
              <Pill>
                <Clock className="size-3" /> {totalMin} min
              </Pill>
            )}
            <Pill>
              <Users className="size-3" /> rinde {fmtDec(recipe.servings, 1)} {recipe.servings === 1 ? "porción" : "porciones"}
            </Pill>
            {recipe.difficulty && <Pill>{recipe.difficulty}</Pill>}
            {baby && <Pill className="bg-baby/15 text-baby">desde {recipe.babyMinMonths ?? 6} meses</Pill>}
            {baby && recipe.babyTexture && <Pill>{recipe.babyTexture}</Pill>}
            {recipe.tags.map((t) => (
              <Pill key={t}>#{t}</Pill>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-xl border bg-card p-3 text-center">
        <Macro label="kcal" value={fmtInt(recipe.kcal)} />
        <Macro label="proteínas" value={`${fmtDec(recipe.protein)} g`} />
        <Macro label="carbohidratos" value={`${fmtDec(recipe.carbs)} g`} />
        <Macro label="grasas" value={`${fmtDec(recipe.fat)} g`} />
        <div className="col-span-4 text-[11px] text-muted-foreground">Valores por porción{recipe.fiber ? ` · fibra ${fmtDec(recipe.fiber)} g` : ""}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="default" className="bg-nutri text-white dark:text-neutral-950 hover:bg-nutri/90">
          <Link href={`${basePath}/${recipe.id}/cocinar`}>
            <ChefHat className="size-4" /> Cocinar paso a paso
          </Link>
        </Button>
        <RecipeActions
          recipeId={recipe.id}
          mealTypes={recipe.mealTypes}
          kcal={recipe.kcal}
          audience={baby ? "baby" : "adult"}
          editHref={`${basePath}/${recipe.id}/editar`}
        />
      </div>

      {allergens.length > 0 && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Contiene alérgenos: {allergens.map((a) => `${ALLERGENS[a]?.emoji ?? ""} ${ALLERGENS[a]?.label ?? a}`).join(" · ")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ingredientes</CardTitle>
          </CardHeader>
          <CardContent>
            <IngredientScaler
              baseServings={recipe.servings}
              ingredients={recipe.ingredients.map((i) => ({
                id: i.id,
                grams: i.grams,
                note: i.note,
                optional: i.optional,
                food: { name: i.food.name, unitName: i.food.unitName, unitGrams: i.food.unitGrams },
              }))}
            />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Paso a paso</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {recipe.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-nutri/15 text-xs font-semibold text-nutri">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          {recipe.tips && (
            <Tip icon={<Lightbulb className="size-4 text-amber-500" />} title="Tip">
              {recipe.tips}
            </Tip>
          )}
          {recipe.storage && (
            <Tip icon={<Refrigerator className="size-4 text-sky-500" />} title="Conservación">
              {recipe.storage}
            </Tip>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <ActionButton
          variant="ghost"
          size="sm"
          className="text-destructive"
          action={archiveRecipe.bind(null, recipe.id)}
          confirm="¿Eliminar esta receta?"
          redirectTo={basePath}
        >
          <Trash2 className="size-3.5" /> Eliminar receta
        </ActionButton>
      </div>
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Tip({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border bg-muted/30 p-3">
      {icon}
      <div className="text-sm">
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
