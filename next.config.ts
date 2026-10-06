import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite carga archivos .wasm/.data desde su propio paquete: no se debe bundlear.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Las migraciones SQL se leen en runtime (también en Vercel).
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },
};

export default nextConfig;
