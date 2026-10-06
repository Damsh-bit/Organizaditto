@AGENTS.md

# Organizaditto — notas del proyecto

App personal (en español rioplatense, voseo) de nutrición/déficit, entrenamiento, trabajo (USD→ARS) y bebé.
Todo está conectado: no dupliques lógica entre módulos, reutilizá `src/lib/*` y `src/lib/data/*`.

## Arquitectura
- `src/db/schema.ts`: esquema Drizzle (Postgres). Tras cambiarlo: `npm run db:generate` (las migraciones en
  `drizzle/` se aplican solas al iniciar, en PGlite y en Neon).
- `src/db/client.ts`: `getDb()` usa Neon si hay `DATABASE_URL`, si no PGlite local. Corre migraciones + seed.
- `src/db/seed/*`: alimentos, recetas (adulto y bebé), ejercicios, rutinas y menús. El seed es idempotente por
  `slug`; para agregar datos nuevos subí `SEED_VERSION` en `src/db/seed/index.ts`. `npm run seed:check` valida slugs.
- `src/lib/data/*` (server-only): consultas por módulo. `src/app/actions/*`: server actions (devuelven
  `ActionResult` y llaman `revalidatePath("/", "layout")`).
- `src/lib/*.ts` puros (usables en cliente): `nutrition` (BMR/TDEE/macros), `planner` (generador de semana),
  `shopping` (cantidades de compra), `training` (MET), `weight`, `dates` (siempre `YYYY-MM-DD`, zona AR), `format`.
- UI: shadcn/ui (radix) en `src/components/ui`; componentes propios por módulo en `src/components/<módulo>`.
  Colores por módulo: `nutri`, `gym`, `work`, `baby` (tokens en `globals.css`).
- Auth opcional: `src/proxy.ts` + `APP_PASSWORD`.

## Convenciones
- Fechas como strings ISO (`todayISO()`), nunca `new Date()` para "hoy" (el server puede estar en UTC).
- Montos: `fmtUSD`, `fmtARS`; números con `fmtInt`/`fmtDec`; parseo de inputs con `parseNum` (acepta coma).
- Formularios simples: `<ActionForm action={serverAction}>` + `<SubmitButton>`; botones: `<ActionButton action={fn.bind(null, id)}>`.
- Probar con `npm run dev:test` (puerto 3100, base separada) para no tocar los datos reales.
