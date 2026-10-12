"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Chrome y Android ofrecen instalar con un evento; iOS sólo lo permite desde Compartir.
export const InstallButton: React.FC = () => {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hint, setHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const capture = (raw: Event) => { raw.preventDefault(); setEvent(raw as InstallEvent); };
    const done = () => { setInstalled(true); setEvent(null); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", done); };
  }, []);

  if (installed || (!event && !ios)) return null;
  return (
    <>
      <button className="button ghost" onClick={async () => { if (event) { await event.prompt(); await event.userChoice; setEvent(null); } else setHint(!hint); }}>
        ⬇ Instalar la app
      </button>
      {hint && <div className="notice" style={{ marginTop: 0 }}>En Safari toca <b>Compartir</b> y luego <b>Agregar a pantalla de inicio</b>.</div>}
    </>
  );
};
