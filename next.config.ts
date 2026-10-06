import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite carga archivos .wasm/.data desde su propio paquete: no se debe bundlear.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Con contraseña, `npm run dev` escucha en la red local: permitir abrirla desde el celular.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  // Si se corta internet, navegación y server actions quedan pendientes y se reintentan solas.
  experimental: {
    useOffline: true,
  },
  // Las migraciones SQL se leen en runtime (también en Vercel).
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },
};

export default nextConfig;
