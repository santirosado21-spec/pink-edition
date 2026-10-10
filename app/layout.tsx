import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pink.ai",
  description: "Sube tu video y recíbelo editado.",
  appleWebApp: { capable: true, title: "Pink.ai", statusBarStyle: "black-translucent" },
};

// `cover` deja que la app use toda la pantalla; el CSS respeta las zonas seguras.
export const viewport: Viewport = { themeColor: "#0c0c10", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
