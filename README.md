# Organizaditto

Tu asistente personal para **nutrición, entrenamiento, trabajo y la alimentación de tu bebé**, con todo conectado:
lo que entrenás suma calorías a tu presupuesto de comida, tu plan semanal arma solo la lista del súper, el peso
semanal recalcula tus objetivos y tus horas de trabajo se convierten a pesos con la cotización de Wallbit.

## Módulos

### 🥗 Nutrición
- **Diario** de comidas: objetivo calórico para el déficit (fórmula Mifflin-St Jeor), macros, agua y
  presupuesto del día = objetivo + % de las calorías quemadas entrenando.
- **Recetario** con 58 recetas argentinas pensadas para el déficit (calorías calculadas por porción),
  escalador de porciones, **modo cocina paso a paso** (pantalla siempre encendida y temporizadores) y editor.
- **Plan semanal** con generador automático que ajusta porciones a tu objetivo (modo vianda/meal prep),
  5 menús semanales armados y guía de preparación de la semana.
- **Lista de compras** semanal, mensual o proyectada (semana × N), separada por **verdulería, carnicería,
  pescadería, súper y dietética**, redondeada a lo que se vende (kg, paquetes, docenas…), con despensa aparte,
  precios y compartir por WhatsApp.
- **Progreso**: promedio diario, adherencia, déficit acumulado vs. cambio real de peso.
- **Alimentos**: base de ~160 alimentos editable (macros, unidades, local de compra, precio) y búsqueda de
  productos envasados en Open Food Facts por nombre o código de barras (con escáner en el celular).

### 🏋️ Entrenamiento
- **Habit tracker** mensual y semanal, rachas y objetivo de días por semana. Botón "Fui al gym hoy".
- Registro de sesiones con rutina precargada, series × reps × kg (o minutos/km), referencia de la última vez.
- **Calorías quemadas** estimadas (MET × peso × tiempo) que se suman a tu comida del día.
- **Peso semanal** con medidas, IMC, ritmo real vs. el esperado por tu déficit y fecha estimada de llegada a la meta.
- Rutinas editables y **progresión** por ejercicio.

### 💼 Trabajo
- **Cronómetro de jornada** con ganancia en vivo, carga rápida de horas y registro manual (total o desde/hasta).
- Tarifa por hora (USD 6 por defecto) y conversión a pesos con la **cotización de Wallbit** (vía ComparaDólar),
  con respaldo en dólar blue/cripto/MEP (DolarAPI) o un valor manual. Se actualiza cada 15 minutos.
- Habit tracker de horas, objetivos semanales, **cobros/retiros** con saldo pendiente y resumen mensual para facturar.

### 👶 Bebé
- Edad, cuenta regresiva a los 6 meses y **etapa actual** (frecuencia, cantidades y texturas).
- 29 recetas para bebé (purés, papillas y BLW) sin sal ni azúcar, filtradas por edad.
- Registro de comidas con aceptación y reacciones; seguimiento de **alimentos probados y alérgenos**.
- Plan semanal y menús para bebé (sus ingredientes entran en tu lista de compras) y **guía** completa.

### 🏠 Inicio
Resumen del día que cruza todos los módulos + hábitos diarios configurables.

## Usarla en tu compu (sin configurar nada)

Requisitos: Node.js 20.9 o superior.

```bash
npm install
npm run dev
```

Abrí <http://localhost:3000>. La primera vez te pide tus datos (peso, altura, etc.).

Los datos se guardan en una base Postgres **local** (PGlite) en `~/.organizaditto/pgdata` (fuera de OneDrive
para evitar conflictos de sincronización). No hace falta instalar ninguna base de datos.

> Para usarla desde el celular en la misma red Wi-Fi: `npm run build` y luego `npm start -- -H 0.0.0.0`,
> y entrá a `http://IP-DE-TU-PC:3000`.

## Publicarla en internet (Vercel + Neon)

Ya tenés la integración de **Neon** instalada en tu cuenta de Vercel, así que son unos clics:

1. En Vercel: **Add New → Project** e importá este repositorio.
2. En el proyecto: **Storage → Create Database → Neon** y conectala al proyecto
   (esto crea la variable `DATABASE_URL` automáticamente).
3. En **Settings → Environment Variables** agregá `APP_PASSWORD` con una contraseña (para que nadie más entre).
4. Deploy. La app crea las tablas y carga recetas/alimentos sola en el primer acceso.
5. Para llevar tus datos locales: en tu compu **Ajustes → Descargar backup**, y en la app publicada
   **Ajustes → Restaurar backup**.

Al abrirla en el celular podés **instalarla como app** (Compartir → "Agregar a pantalla de inicio").

## Variables de entorno

Ver [`.env.example`](.env.example). Todas son opcionales:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Postgres de Neon. Si no está, se usa la base local PGlite. |
| `APP_PASSWORD` | Activa el login con contraseña (recomendado al publicar). |
| `AUTH_SECRET` | Secreto extra para firmar la sesión (opcional). |
| `PGLITE_DIR` | Carpeta de la base local (por defecto `~/.organizaditto/pgdata`). |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run typecheck` | Chequeo de tipos |
| `npm run lint` | ESLint |
| `npm test` | Tests de la lógica (calorías, plan semanal, compras, peso, fechas) |
| `npm run db:generate` | Genera una migración SQL después de cambiar `src/db/schema.ts` |
| `npm run seed:check` | Valida que las recetas/menús del seed referencien alimentos existentes |
| `npm run dev:test` | Dev en el puerto 3100 con una base de pruebas separada |

## Tecnología

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS 4 · shadcn/ui · Drizzle ORM ·
PGlite (local) / Neon (nube) · Recharts. Cotizaciones: ComparaDólar, DolarAPI y ArgentinaDatos.

## Próximamente

- **Finanzas**: gastos e ingresos conectados con las listas de compras (los precios que cargás ya quedan guardados)
  y con los cobros del módulo de trabajo.

---

La información nutricional y la guía para bebés son orientativas y no reemplazan la consulta con profesionales
de la salud.
