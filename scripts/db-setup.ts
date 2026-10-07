// Corre en el build de Vercel: aplica migraciones y carga el seed en Neon una sola vez por deploy,
// así no hay instancias compitiendo por migrar en la primera visita y esa visita no espera el seed.
// Sin DATABASE_URL (uso local con PGlite) no hace nada: la app migra sola al iniciar.
import { getDb } from "../src/db/client";

async function main() {
  if (!process.env.DATABASE_URL) {
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
