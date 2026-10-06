import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Organizaditto",
    short_name: "Organizaditto",
    description: "Tu asistente personal de nutrición, entrenamiento, trabajo y bebé.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7fbf9",
    theme_color: "#0f9f6e",
    lang: "es-AR",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Diario de comidas", url: "/nutricion" },
      { name: "Registrar entreno", url: "/entrenamiento/nuevo" },
      { name: "Trabajo", url: "/trabajo" },
    ],
  };
}
