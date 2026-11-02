import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { StockPhoto } from "../../src/edit";
import { commonsPhoto, searchCommonsPhotos } from "./commonsPhotos";

type PixabayPhoto = { id: number; pageURL: string; user: string; tags: string; webformatURL: string; largeImageURL: string };
const pixabayLicense = "https://pixabay.com/service/license-summary/";
const pixabayPending = new Map<string, Promise<{ hits: PixabayPhoto[] }>>();
async function pixabay(params: Record<string, string>): Promise<{ hits: PixabayPhoto[] }> {
  const key = process.env.PIXABAY_API_KEY?.trim();
  if (!key) throw new Error("Falta PIXABAY_API_KEY en .env.local. Obtén tu clave en pixabay.com/api/docs/.");
  const query = new URLSearchParams({ ...params, key });
  // Pixabay exige caché de 24 h. El archivo no contiene la clave ni la URL de API.
  const hash = createHash("sha256").update(query.toString()).digest("hex");
  const file = path.join(process.cwd(), "work", "_stock-cache", "pixabay", `${hash}.json`);
  try {
    const saved = JSON.parse(await fs.readFile(file, "utf8"));
    if (Date.now() >= saved.at && Date.now() - saved.at < 86_400_000 && Array.isArray(saved.data?.hits)) return saved.data;
  } catch { /* Caché ausente o ilegible: consultar el proveedor. */ }
  const pending = pixabayPending.get(hash);
  if (pending) return pending;
  const request = (async () => {
    try {
      const response = await fetch(`https://pixabay.com/api/?${query}`, { signal: AbortSignal.timeout(20000), cache: "no-store", redirect: "error" });
      if (!response.ok) throw new Error(response.status === 429 ? "Pixabay alcanzó su cuota temporal. Intenta más tarde." : "Pixabay rechazó la solicitud. Revisa tu clave e intenta otra vez.");
      const data = await response.json();
      if (!Array.isArray(data.hits)) throw new Error("Pixabay devolvió una respuesta inválida.");
      await fs.mkdir(path.dirname(file), { recursive: true });
      const temporary = `${file}.${randomUUID()}.tmp`;
      await fs.writeFile(temporary, JSON.stringify({ at: Date.now(), data }), { mode: 0o600 });
      await fs.rename(temporary, file);
      return data as { hits: PixabayPhoto[] };
    } catch (error) {
      // Los errores de transporte pueden incluir la URL y su key; nunca devolverlos.
      if (error instanceof Error && error.message.startsWith("Pixabay ")) throw error;
      throw new Error("No se pudo conectar con Pixabay o guardar su caché. Intenta otra vez.");
    }
  })();
  pixabayPending.set(hash, request);
  try { return await request; } finally { pixabayPending.delete(hash); }
}

const allowedPixabayImage = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (url.hostname === "cdn.pixabay.com" || (url.hostname === "pixabay.com" && url.pathname.startsWith("/get/")));
  } catch { return false; }
};

type Photo = { id: number; url: string; photographer: string; alt: string; src: { medium: string; large2x: string } };
async function pexels(endpoint: string) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("Falta configurar PEXELS_API_KEY en .env.local. La clave se obtiene gratis en pexels.com/api.");
  const response = await fetch(`https://api.pexels.com/v1/${endpoint}`, {
    headers: { Authorization: key }, signal: AbortSignal.timeout(15000), cache: "no-store",
  });
  if (!response.ok) throw new Error(response.status === 429 ? "Se alcanzó el límite de Pexels. Intenta más tarde." : "Pexels no respondió correctamente. Revisa la clave e intenta otra vez.");
  return response.json();
}
type OpenPhoto = { id: string; url: string; thumbnail: string; creator: string; title: string; foreign_landing_url: string; license: string; mature: boolean };
const cc0 = "https://creativecommons.org/publicdomain/zero/1.0/";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const allowedImage = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && !url.username && !url.password &&
      ["live.staticflickr.com", "upload.wikimedia.org"].includes(url.hostname) && /\.(jpe?g|png|webp)$/i.test(url.pathname);
  } catch { return false; }
};
async function openverse(endpoint: string) {
  const response = await fetch(`https://api.openverse.org/v1/images/${endpoint}`, {
    signal: AbortSignal.timeout(20000), cache: "no-store",
  });
  if (!response.ok) throw new Error(response.status === 429 ? "Openverse alcanzó su cuota temporal. Espera un momento." : "Openverse no está disponible. Intenta otra vez.");
  return response.json();
}

export async function searchPhotos(query: string, provider: StockPhoto["provider"]) {
    if (provider === "Wikimedia") return searchCommonsPhotos(query);
    if (provider === "Pixabay") {
      const data = await pixabay({ q: query, image_type: "photo", safesearch: "true", per_page: "12", min_width: "1000" });
      return { photos: data.hits.filter(photo => allowedPixabayImage(photo.largeImageURL) && allowedPixabayImage(photo.webformatURL)).map(photo => ({
        id: photo.id, provider: "Pixabay", url: photo.pageURL, photographer: photo.user || "Autor no indicado", alt: photo.tags, preview: photo.webformatURL,
      })) };
    }
    if (provider !== "Pexels") {
      const data = await openverse(`?${new URLSearchParams({ q: query, license: "cc0", page_size: "20", mature: "false" })}`);
      return { photos: data.results.filter((photo: OpenPhoto) => photo.license === "cc0" && !photo.mature && allowedImage(photo.url)).slice(0, 12).map((photo: OpenPhoto) => ({
        id: photo.id, provider: "Openverse", url: photo.foreign_landing_url, photographer: photo.creator || "Autor no indicado", alt: photo.title, preview: photo.thumbnail,
      })) };
    }
    const data = await pexels(`search?${new URLSearchParams({ query, locale: "es-ES", per_page: "12", orientation: "landscape" })}`);
    return { photos: data.photos.map((photo: Photo) => ({ id: photo.id, provider: "Pexels", url: photo.url, photographer: photo.photographer, alt: photo.alt, preview: photo.src.medium })) };
}

export async function downloadPhoto(job: string, photoId: number | string, provider: StockPhoto["provider"]) {
    const validPhoto = provider === "Pexels" || provider === "Pixabay" || provider === "Wikimedia" ? typeof photoId === "number" && Number.isSafeInteger(photoId) && photoId > 0 : provider === "Openverse" && typeof photoId === "string" && uuid.test(photoId);
    if (typeof job !== "string" || !/^[a-z0-9][a-z0-9-]{0,60}$/.test(job) || !validPhoto) {
      throw new Error("Foto o video inválido.");
    }
    await fs.access(path.join(/* turbopackIgnore: true */ process.cwd(), "work", job, "timeline.json"));
    // Consultar el ID al proveedor: nunca descargar una URL enviada por el cliente.
    let photo: { id: string | number; photographer: string; url: string; alt: string; image: string; license: string };
    if (provider === "Wikimedia") {
      photo = await commonsPhoto(photoId as number);
    } else if (provider === "Pixabay") {
      const data = await pixabay({ id: String(photoId), image_type: "photo", safesearch: "true" });
      const item = data.hits.find(hit => hit.id === photoId);
      if (!item || !allowedPixabayImage(item.largeImageURL)) throw new Error("La foto de Pixabay ya no está disponible o su origen no está permitido.");
      photo = { id: item.id, photographer: item.user || "Autor no indicado", url: item.pageURL, alt: item.tags, image: item.largeImageURL, license: pixabayLicense };
    } else if (provider === "Openverse") {
      const item: OpenPhoto = await openverse(`${photoId}/`);
      if (item.license !== "cc0" || item.mature || !allowedImage(item.url)) throw new Error("La imagen no cumple el filtro CC0 o su origen no está habilitado.");
      photo = { id: item.id, photographer: item.creator || "Autor no indicado", url: item.foreign_landing_url, alt: item.title, image: item.url, license: cc0 };
    } else {
      const item: Photo = await pexels(`photos/${photoId}`);
      photo = { ...item, image: item.src.large2x, license: "https://www.pexels.com/legal-pages/license/" };
    }
    const url = new URL(photo.image);
    if (provider === "Pexels" && (url.protocol !== "https:" || url.hostname !== "images.pexels.com")) throw new Error("Origen de imagen no permitido.");
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30000) });
    if (!response.ok || !["image/jpeg", "image/png", "image/webp"].includes((response.headers.get("content-type") ?? "").split(";")[0])) throw new Error("No se pudo descargar la imagen.");
    const maximum = 15 * 1024 * 1024;
    if (Number(response.headers.get("content-length")) > maximum) throw new Error("La foto supera 15 MB.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body!.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > maximum) throw new Error("La foto supera 15 MB.");
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const asset = `work/${job}/photos/${provider.toLowerCase()}-${photo.id}.jpg`;
    const destination = path.join(/* turbopackIgnore: true */ process.cwd(), "public", asset);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, Buffer.concat(chunks));
    const credit = { provider, id: photo.id, photographer: photo.photographer, url: photo.url,
      license: photo.license, downloadedAt: new Date().toISOString(), asset };
    await fs.writeFile(destination + ".json", JSON.stringify(credit, null, 2));
    return { photo: { ...credit, alt: photo.alt } };
}
