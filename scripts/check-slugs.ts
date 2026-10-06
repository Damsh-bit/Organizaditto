import { FOODS } from "../src/db/seed/foods";
import { ADULT_RECIPES } from "../src/db/seed/recipes";
import { BABY_RECIPES } from "../src/db/seed/baby-recipes";
import { MENUS, BABY_MENUS } from "../src/db/seed/menus";
import { EXERCISES, ROUTINES } from "../src/db/seed/training";
const fs = new Set(FOODS.map(f => f.slug));
const dup = FOODS.map(f=>f.slug).filter((s,i,a)=>a.indexOf(s)!==i); if (dup.length) console.log("dup foods", dup);
const all = [...ADULT_RECIPES, ...BABY_RECIPES];
const rs = new Set(all.map(r => r.slug));
let n = 0;
for (const r of all) for (const [s] of r.ingredients) { n++; if (!fs.has(s)) console.log("missing food", s, "in", r.slug); }
for (const m of [...MENUS, ...BABY_MENUS]) for (const it of m.items) if (!rs.has(it.recipeSlug!)) console.log("missing recipe", it.recipeSlug, "in", m.slug);
const es = new Set(EXERCISES.map(e=>e.slug));
for (const r of ROUTINES) for (const [s] of r.exercises) if (!es.has(s)) console.log("missing ex", s);
console.log("ingredients total", n);
