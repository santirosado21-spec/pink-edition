import "server-only";
import type { StockPhoto } from "../../src/edit";

export function stockProviderStatus(): { provider: StockPhoto["provider"]; ready: boolean; message: string } {
  const selected = process.env.EDITOR_STOCK_PROVIDER?.toLowerCase();
  const provider = selected === "wikimedia" ? "Wikimedia" : selected === "openverse" ? "Openverse" : selected === "pexels" ? "Pexels" : selected === "pixabay" ? "Pixabay"
    : "Wikimedia";
  if (selected && !["pixabay", "pexels", "openverse", "wikimedia"].includes(selected)) return { provider, ready: false, message: "EDITOR_STOCK_PROVIDER debe ser wikimedia, openverse, pixabay o pexels." };
  const key = provider === "Pixabay" ? "PIXABAY_API_KEY" : "PEXELS_API_KEY";
  const ready = (provider === "Openverse" || provider === "Wikimedia") || Boolean(process.env[key]?.trim());
  return { provider, ready, message: ready ? `Fotos: ${provider}${(provider === "Openverse" || provider === "Wikimedia") ? " · CC0 · sin clave" : " configurado"}.` : `Fotos pendientes: falta ${key} en .env.local.` };
}
