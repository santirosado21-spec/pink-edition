import type { MetadataRoute } from "next";

// Permite instalar Pink.ai desde el navegador del celular como si fuera una app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pink.ai",
    short_name: "Pink.ai",
    description: "Sube tu video y recíbelo editado para Reels, TikTok y Shorts.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0c10",
    theme_color: "#0c0c10",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Subir un video", short_name: "Subir", url: "/app" }],
  };
}
