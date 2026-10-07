// Corre en el build de Vercel: aplica migraciones y carga el seed en Neon una sola vez por deploy,
// así no hay instancias compitiendo por migrar en la primera visita y esa visita no espera el seed.
// Sin base configurada (uso local con PGlite) no hace nada: la app migra sola al iniciar.
import { databaseUrl, getDb } from "../src/db/client";

async function main() {
  if (!databaseUrl()) {
    // En producción una base temporal significa perder datos: mejor que el deploy falle y quede el anterior.
    if (process.env.VERCEL_ENV === "production") {
      throw new Error("No hay DATABASE_URL en producción. Conectá la base Neon en Vercel → Storage y volvé a desplegar.");
    }
    console.log("[db-setup] Sin DATABASE_URL: se omite (PGlite migra al iniciar la app).");
    return;
  }
  const t = Date.now();
  await getDb();
  console.log(`[db-setup] Neon listo: migraciones y seed aplicados en ${Date.now() - t} ms.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[db-setup] Falló la preparación de la base:", err);
    process.exit(1);
  });
