import { definedOrPending as pending, landingConfig } from "./config";
export default function Faq() {
  const c = landingConfig.faqConditions;
  const questions = [
    [
      "¿Qué material puedo subir?",
      `El editor local se ha probado únicamente con videos verticales de una persona hablando a cámara, en español. La carga pública aún no está habilitada. Extensiones de archivo: ${pending(c.uploadFormats)}. Peso máximo: ${pending(c.maxFileSize)}.`,
    ],
    [
      "¿Para qué formatos está pensado?",
      `Contenido corto para Reels, TikTok y YouTube Shorts, en vertical 9:16. No ofrecemos películas, documentales ni podcasts completos. Duración admitida: ${pending(c.admittedDuration)}.`,
    ],
    [
      "¿Cómo funcionan las correcciones?",
      `Hoy, en el editor local, eliges frases y ajustas gráficos, cortes de color y fondos, con vista previa. Pedir cambios con lenguaje natural es una función prevista, todavía no conectada. Condiciones de las correcciones: ${pending(c.corrections)}.`,
    ],
    [
      "¿Qué consume créditos?",
      `Los créditos y los pagos todavía no están implementados. Reglas de consumo: ${pending(c.creditConsumption)}. El costo se mostrará antes de confirmar una edición cuando el servicio esté habilitado; no se promete uso ilimitado ni correcciones gratuitas.`,
    ],
    [
      "¿Cómo descargo el resultado?",
      `En el sistema local, renderizas la edición y descargas un MP4 de 1080 × 1920. La descarga pública aún no está conectada. Disponibilidad y conservación de las descargas: ${pending(c.downloadAvailability)}.`,
    ],
    [
      "¿La IA ya propone la primera edición?",
      "Todavía no. El código de la propuesta automática existe, pero no ha sido probado. Hoy funcionan el corte automático de silencios y los subtítulos sincronizados; las decisiones gráficas se hacen en el editor local.",
    ],
  ];
  return (
    <div className="faq-list">
      {questions.map(([question, answer]) => (
        <details key={question}>
          <summary>
            {question}
            <span aria-hidden="true">+</span>
          </summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  );
}
