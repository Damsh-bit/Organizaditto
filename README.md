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
- **Progreso**: promedio diario, adherencia, déficit acumulado vs. cambio real de peso y **gasto real**:
  con 10+ días registrados y 3 pesajes calcula cuánto gastás de verdad (comidas − tendencia de la balanza)
  y te sugiere ajustar el objetivo con un clic.
- **Alimentos**: base de ~160 alimentos editable (macros, unidades, local de compra, precio) y búsqueda de
  productos envasados en Open Food Facts por nombre o código de barras (con escáner en el celular).

### 🏋️ Entrenamiento
- **Habit tracker** mensual y semanal, rachas y objetivo de días por semana. Botón "Fui al gym hoy".
- Registro de sesiones con rutina precargada, series × reps × kg (o minutos/km), referencia de la última vez.
- **Calorías quemadas** estimadas (MET × peso × tiempo) que se suman a tu comida del día.
- **Peso semanal** con medidas, IMC, ritmo real vs. el esperado por tu déficit y fecha estimada de llegada a la meta.
- **Fotos de progreso** (frente, perfil y espalda) con comparador antes/después y el peso de cada fecha. Se
  achican en el navegador y quedan en tu base (en el backup automático van en un archivo aparte).
- Rutinas editables y **progresión** por ejercicio.
- **Pasos y sueño** con objetivos: promedios en Entreno y en el resumen semanal, y cruce con lo que comés
  (los días que dormís poco, ¿comés más?). Si dormiste poco, el Inicio te avisa.

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
- **Crecimiento**: peso, talla y perímetro cefálico con percentiles y curvas de la OMS (0 a 2 años), aumento
  por semana, historial de controles y lista de **preguntas para el próximo control** con el pediatra.
- **Vacunas**: Calendario Nacional de Vacunación 2026 con lo aplicado, lo que toca, lo próximo y lo atrasado
  (con aviso en el Inicio), más vacunas fuera de calendario.

### 🏠 Inicio
Resumen del día que cruza todos los módulos + hábitos diarios configurables.

## Usarla en tu compu (sin configurar nada)

Requisitos: Node.js 20.9 o superior.

```bash
npm install
npm run dev
```

Abrí <http://localhost:3000>. La primera vez te pide tus datos (peso, altura, etc.).

En Windows también podés hacer **doble clic en `Iniciar Organizaditto.cmd`**: instala lo necesario la primera vez,
compila y abre la app en el navegador.

Los datos se guardan en una base Postgres **local** (PGlite) en `~/.organizaditto/pgdata` (fuera de OneDrive
para evitar conflictos de sincronización). No hace falta instalar ninguna base de datos.

**Backup automático:** la primera vez que abrís la app cada día se guarda una copia comprimida en
`OneDrive/Organizaditto/backups` (se sube sola a tu OneDrive). Quedan los últimos 14 días y uno por mes, y se
restauran desde **Ajustes → Datos y backup**.

### Desde el celular, con el Wi-Fi de tu casa

Por seguridad, sin contraseña la app **solo escucha en tu PC**. Para usarla desde el celular:

1. **Ajustes → Usar desde el celular**: poné una contraseña.
2. Cerrá y volvé a abrir la app (`Iniciar Organizaditto.cmd` o `npm start`): ahora escucha en tu red local.
3. Escaneá el código QR que aparece en Ajustes (o escribí la dirección, tipo `http://192.168.1.37:3000`), ingresá
   la contraseña y agregala a la pantalla de inicio.

La PC tiene que estar prendida con la app abierta. La primera vez Windows puede preguntar si Node.js puede usar
la red: elegí "Redes privadas".

## Publicada en Vercel

La app está en **<https://organizaditto.vercel.app>**, conectada a este repo: cada push a `main` se publica solo.

- **Acceso:** el proyecto tiene *Vercel Authentication* en todas las URLs, así que solo entra quien esté logueado
  con tu cuenta de Vercel (en el celular, iniciás sesión una vez). No hace falta `APP_PASSWORD`.
- **Base de datos:** Neon (Postgres), conectada desde Vercel → Storage (crea `DATABASE_URL`). En cada deploy,
  `scripts/db-setup.ts` aplica las migraciones y el seed antes del build, así la app arranca lista.
- **Llevar tus datos de la PC:** en tu compu **Ajustes → Descargar backup**, y en la app publicada
  **Ajustes → Restaurar backup**.

Al abrirla en el celular podés **instalarla como app** (Compartir → "Agregar a pantalla de inicio").

## Variables de entorno

Ver [`.env.example`](.env.example). Todas son opcionales:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Postgres de Neon. Si no está, se usa la base local PGlite. |
| `APP_PASSWORD` | Activa el login con contraseña (obligatorio al publicar). En tu PC también podés ponerla desde Ajustes. |
| `AUTH_SECRET` | Secreto extra para firmar la sesión (opcional). |
| `PGLITE_DIR` | Carpeta de la base local (por defecto `~/.organizaditto/pgdata`). |
| `BACKUP_DIR` | Carpeta del backup automático (por defecto `OneDrive/Organizaditto/backups`). |
| `AUTO_BACKUP` | `0` desactiva el backup automático. |
| `HOST` | Fuerza la dirección donde escucha (por defecto `127.0.0.1`, o `0.0.0.0` si hay contraseña). |

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
