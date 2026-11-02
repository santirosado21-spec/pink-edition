import type { MetadataRoute } from "next";

// Permite instalar Cutkind desde el navegador del celular como si fuera una app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cutkind",
    short_name: "Cutkind",
    description: "Sube tu video y recíbelo editado para Reels, TikTok y Shorts.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f5ef",
    theme_color: "#f7f5ef",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png?v=white-1", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png?v=white-1", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png?v=white-1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Subir un video", short_name: "Subir", url: "/app" }],
  };
}
