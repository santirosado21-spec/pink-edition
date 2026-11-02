import "server-only";

export const COMMONS_CC0 = "https://creativecommons.org/publicdomain/zero/1.0/";
type Info = {
  url: string; thumburl?: string; descriptionurl: string; mime: string;
  extmetadata: Record<string, { value?: string }>;
};
type Page = { pageid: number; ns: number; index?: number; title: string; imageinfo?: Info[] };
const plain = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').slice(0, 500);
export function commonsImageAllowed(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.port && !u.username && !u.password &&
      ["upload.wikimedia.org", "thumb.wikimedia.org"].includes(u.hostname) && u.pathname.startsWith("/wikipedia/commons/") && /\.(jpe?g|png|webp)$/i.test(u.pathname);
  } catch { return false; }
}
function resource(page: Page) {
  const info = page.imageinfo?.[0], meta = info?.extmetadata;
  if (page.ns !== 6 || !info || !meta || meta.LicenseShortName?.value !== "CC0" ||
    !/^https?:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/(?:deed\.[a-z-]+)?$/i.test(meta.LicenseUrl?.value ?? "") ||
    !["image/jpeg", "image/png", "image/webp"].includes(info.mime) || !commonsImageAllowed(info.url)) return null;
  const image = info.thumburl && commonsImageAllowed(info.thumburl) ? info.thumburl : info.url;
  return { id: page.pageid, provider: "Wikimedia" as const, photographer: plain(meta.Artist?.value ?? "Autor no indicado"),
    alt: plain(page.title.replace(/^File:/, "")), url: `https://commons.wikimedia.org/?curid=${page.pageid}`,
    preview: image, image, license: COMMONS_CC0 };
}
async function queryCommons(params: Record<string, string>): Promise<Page[]> {
  try {
    const query = new URLSearchParams({ action: "query", format: "json", prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "1280",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl", ...params });
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${query}`, {
      headers: { "User-Agent": "CutkindLocalPilot/0.1 (local video editor; Wikimedia Commons search)" },
      signal: AbortSignal.timeout(20000), cache: "no-store", redirect: "error",
    });
    if (!response.ok) throw new Error(response.status === 429 ? "Wikimedia alcanzó su cuota temporal. Espera antes de reintentar." : "Wikimedia no está disponible.");
    const data = await response.json();
    if (data.error) throw new Error("Wikimedia no pudo completar la búsqueda.");
    return Object.values(data.query?.pages ?? {});
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Wikimedia ")) throw error;
    throw new Error("No se pudo conectar con Wikimedia. Revisa tu conexión e intenta otra vez.");
  }
}
export async function searchCommonsPhotos(query: string) {
  // Quitar operadores del buscador; la licencia se comprueba además por archivo.
  const terms = query.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().slice(0, 100);
  if (!terms) return { photos: [] };
  const pages = await queryCommons({ generator: "search", gsrsearch: `${terms} filetype:bitmap incategory:CC-Zero`, gsrnamespace: "6", gsrlimit: "12" });
  return { photos: pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).flatMap(page => {
    const item = resource(page); return item ? [item] : [];
  }) };
}
export async function commonsPhoto(id: number) {
  const pages = await queryCommons({ pageids: String(id) });
  const page = pages.find(page => page.pageid === id);
  const item = page && resource(page);
  if (!item) throw new Error("La imagen de Wikimedia no está disponible con licencia CC0 y formato admitido.");
  return item;
}
