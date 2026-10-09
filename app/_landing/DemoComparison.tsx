import { landingConfig } from "./config";
import { Badge } from "./Elements";

export default function DemoComparison() {
  const { original, edited, captions } = landingConfig.demo;
  const ready = Boolean(original && edited);
  return (
    <>
      <div className="comparison">
        {[
          {
            title: "Tu grabación",
            subtitle: "El punto de partida",
            src: original,
          },
          {
            title: "Tu video editado",
            subtitle: "La misma voz, otra intención",
            src: edited,
          },
        ].map((item, index) => (
          <figure
            key={item.title}
            className={`comparison-card comparison-${index}`}
          >
            <figcaption>
              <span className="eyebrow">
                {index === 0 ? "ANTES" : "DESPUÉS"}
              </span>
              <h3>{item.title}</h3>
              <p>{item.subtitle}</p>
            </figcaption>
            {ready && item.src ? (
              <video
                controls
                playsInline
                preload="none"
                aria-label={item.title}
                src={item.src}
              >
                {captions && (
                  <track
                    kind="captions"
                    src={captions}
                    srcLang="es"
                    label="Español"
                    default
                  />
                )}
                Tu navegador no permite reproducir este video.
              </video>
            ) : (
              <div className="video-placeholder">
                <svg viewBox="0 0 80 100" fill="none" aria-hidden="true">
                  <rect
                    x="17"
                    y="4"
                    width="46"
                    height="82"
                    rx="9"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M34 33l18 12-18 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path d="M31 95h18" stroke="currentColor" strokeWidth="2" />
                </svg>
                <Badge>Demo pendiente</Badge>
                <p>Aquí irá el video {index === 0 ? "original" : "editado"}.</p>
              </div>
            )}
          </figure>
        ))}
      </div>
      <p className="comparison-note">
        {ready
          ? "Comparación de la demo autorizada. Reproduce cada video con sus controles."
          : "Todavía no hay una demo autorizada para publicación. Este espacio no reproduce material real ni simula un resultado."}
      </p>
    </>
  );
}
