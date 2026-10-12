import { definedOrPending as pending, landingConfig } from "./config";

export default function Faq() {
  const c = landingConfig.faqConditions;
  const questions: [string, string][] = [
    ["¿Qué material puedo subir?", `Grabaciones verticales de una persona hablando a cámara, en español. Hasta ${pending(c.admittedDuration)} y ${pending(c.maxFileSize)} por video. Formatos de archivo: ${pending(c.uploadFormats)}.`],
    ["¿Para qué formatos sirve?", "Reels, TikTok y YouTube Shorts: contenido corto en vertical. No editamos películas, documentales ni podcasts completos."],
    ["¿Cómo funcionan las correcciones?", `Hoy ajustas la edición en el editor, con vista previa. Pedir cambios con tus palabras está en camino. Correcciones incluidas: ${pending(c.corrections)}.`],
    ["¿Qué consume créditos?", `Las reglas todavía no están definidas (${pending(c.creditConsumption)}). Siempre verás el costo antes de confirmar una edición.`],
    ["¿Cómo descargo el resultado?", `Descargas un MP4 vertical de 1080 × 1920 listo para publicar. Conservación de las descargas: ${pending(c.downloadAvailability)}.`],
    ["¿La IA ya propone la primera edición?", "Todavía no está lista. Hoy el corte de pausas y los subtítulos son automáticos y los gráficos los eliges tú en el editor."],
    ["¿Puedo ponerle música?", "Pink.ai no incluye música: la agregas desde Instagram o TikTok al publicar."],
  ];
  return (
    <div className="faq">
      {questions.map(([question, answer]) => (
        <details key={question}>
          <summary>{question}<span aria-hidden="true" /></summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  );
}
