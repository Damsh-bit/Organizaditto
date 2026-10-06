import { getDb } from "../src/db/client";
import { foods, recipes, recipeIngredients, exercises, routines, menuTemplates, habits } from "../src/db/schema";
import { count, eq } from "drizzle-orm";

async function main() {
  const t = Date.now();
  const db = await getDb();
  console.log("init ms", Date.now() - t);
  for (const [n, tbl] of Object.entries({ foods, recipes, recipeIngredients, exercises, routines, menuTemplates, habits })) {
    const [r] = await db.select({ c: count() }).from(tbl as any);
    console.log(n, r.c);
  }
  const rs = await db.select({ name: recipes.name, kcal: recipes.kcal, p: recipes.protein, aud: recipes.audience }).from(recipes);
  for (const r of rs) console.log(r.aud, Math.round(r.kcal), r.p, r.name);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
