import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./cutkind.css";

export const metadata: Metadata = {
  title: "Cutkind",
  description: "Sube tu video y recíbelo editado.",
  appleWebApp: { capable: true, title: "Cutkind", statusBarStyle: "black-translucent" },
};

// `cover` deja que la app use toda la pantalla; el CSS respeta las zonas seguras.
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7f5ef" }, { media: "(prefers-color-scheme: dark)", color: "#20211f" }], width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("cutkind-theme");document.documentElement.dataset.theme=t==="light"||t==="dark"?t:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}` }} /></head>
      <body>{children}</body>
    </html>
  );
}
