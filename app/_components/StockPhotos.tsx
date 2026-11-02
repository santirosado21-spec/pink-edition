"use client";
import { useState } from "react";
import type { StockPhoto } from "../../src/edit";

type Result = { id: number | string; provider: StockPhoto["provider"]; photographer: string; url: string; alt: string; preview: string };
export function StockPhotos({ job, disabled, onSelect }: { job: string; disabled: boolean; onSelect: (photo: StockPhoto) => void }) {
  const [provider, setProvider] = useState<StockPhoto["provider"]>("Wikimedia");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function search() {
    setBusy(true); setMessage(""); setPhotos([]);
    try {
      const response = await fetch(`/api/photos?q=${encodeURIComponent(query)}&provider=${provider}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPhotos(data.photos);
      if (!data.photos.length) setMessage("No encontramos fotos. Prueba otra palabra; prueba también términos en inglés.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function select(photoId: number | string, source: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job, photoId, provider: source }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSelect(data.photo);
      setMessage("Foto agregada. Guarda el montaje antes de exportar.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="steps-box" aria-label="Fotos gratuitas">
    <h3>Fotos para esta frase</h3>
    <p>Selecciona una frase del video y busca una imagen relacionada.</p>
    <label>Banco de fotos <select disabled={busy} value={provider} onChange={(event) => { setProvider(event.target.value as StockPhoto["provider"]); setPhotos([]); setMessage(""); }}>
      <option value="Wikimedia">Wikimedia Commons · CC0 · sin clave</option><option value="Pixabay">Pixabay · requiere clave</option><option value="Openverse">Openverse · CC0 · sin clave</option><option value="Pexels">Pexels · requiere clave</option>
    </select></label>
    <form onSubmit={(event) => { event.preventDefault(); void search(); }}>
      <input aria-label="Buscar fotos" placeholder="Ej. naturaleza, ciudad, ejercicio" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} />
      <button className="button" disabled={busy || !query.trim()}>{busy ? "Cargando…" : "Buscar fotos"}</button>
    </form>
    <p>{provider === "Wikimedia" ? <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">Imágenes CC0 de Wikimedia Commons</a> : provider === "Openverse" ? <a href="https://openverse.org" target="_blank" rel="noreferrer">Fotos CC0 encontradas con Openverse</a> : provider === "Pixabay" ? <a href="https://pixabay.com" target="_blank" rel="noreferrer">Fotos proporcionadas por Pixabay</a> : <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Fotos proporcionadas por Pexels</a>}</p>
    <p className="muted">No uses personas reconocibles para insinuar enfermedades o apoyo a una marca. <a href={(provider === "Openverse" || provider === "Wikimedia") ? "https://creativecommons.org/publicdomain/zero/1.0/" : provider === "Pixabay" ? "https://pixabay.com/service/license-summary/" : "https://www.pexels.com/legal-pages/license/"} target="_blank" rel="noreferrer">Ver licencia</a></p>
    <p role="status">{message}</p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {photos.map((photo) => <div key={photo.id}>
        {/* Miniatura externa; la foto seleccionada se descarga para el render local. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.preview} alt={photo.alt || "Foto de archivo"} loading="lazy" style={{ width: "100%", height: 90, objectFit: "cover" }} />
        <a href={photo.url} target="_blank" rel="noreferrer">{photo.photographer}</a>
        <button className="button" disabled={disabled || busy} onClick={() => void select(photo.id, photo.provider)}>Agregar foto</button>
      </div>)}
    </div>
    {disabled && <p className="muted">Selecciona una frase para agregar una foto.</p>}
  </section>;
}
