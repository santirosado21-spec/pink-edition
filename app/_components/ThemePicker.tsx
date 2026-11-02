"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const validTheme = (value: string | null): Theme => value === "light" || value === "dark" ? value : "system";

export function ThemePicker() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let preference: Theme = "system";
      try { preference = validTheme(localStorage.getItem("cutkind-theme")); } catch { /* Almacenamiento no disponible. */ }
      setTheme(preference);
      document.documentElement.dataset.theme = preference === "system" ? (media.matches ? "dark" : "light") : preference;
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("cutkind-theme-change", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("cutkind-theme-change", sync);
    };
  }, []);

  return (
    <label className="theme-picker">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" /></svg>
      <span className="sr-only">Apariencia</span>
      <select aria-label="Apariencia" value={theme} onChange={(event) => {
        const next = validTheme(event.target.value);
        setTheme(next);
        document.documentElement.dataset.theme = next === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next;
        try { localStorage.setItem("cutkind-theme", next); window.dispatchEvent(new Event("cutkind-theme-change")); } catch { /* La elección funciona también sin persistencia. */ }
      }}>
        <option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option>
      </select>
    </label>
  );
}
