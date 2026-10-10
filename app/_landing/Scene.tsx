// Pantalla de teléfono dibujada: cielo, silueta, tarjeta de vidrio y captions. No usa fotos.
export type SceneProps = {
  words?: string[];
  shown?: number;
  card?: boolean;
  dim?: boolean;
  rings?: boolean;
  cut?: string | null;
  tone?: "blue" | "green" | "red";
};

export function Scene({ words = [], shown = 0, card, dim, rings, cut, tone = "blue" }: SceneProps) {
  return (
    <div className={`scene${dim ? " dim" : ""}`}>
      <div className="scene-sky" />
      <div className="scene-floor" />
      {rings && (
        <svg className="scene-rings" viewBox="0 0 200 200" aria-hidden="true">
          {[0, 1, 2].map((i) => <circle key={i} cx="100" cy="92" r="30" style={{ animationDelay: `${i * 0.7}s` }} />)}
        </svg>
      )}
      <div className={`scene-glass${card ? " on" : ""}`} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <i key={i} className={i === 0 ? "hot" : ""} />)}
      </div>
      <svg className="scene-person" viewBox="0 0 200 250" aria-hidden="true">
        <path d="M18 250 C18 190 52 168 100 168 C148 168 182 190 182 250 Z" fill="#26303f" />
        <path d="M84 150 H116 V176 C108 184 92 184 84 176 Z" fill="#d9a184" />
        <ellipse cx="100" cy="106" rx="39" ry="46" fill="#e2ac8e" />
        <path d="M60 100 C58 58 84 46 104 48 C132 50 144 74 140 102 C132 84 118 76 100 76 C82 76 68 84 60 100 Z" fill="#2b1d1a" />
        <circle cx="86" cy="108" r="3" fill="#2b1d1a" />
        <circle cx="114" cy="108" r="3" fill="#2b1d1a" />
        <path d="M90 128 Q100 135 110 128" stroke="#a5604d" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <div className="scene-caption" aria-hidden={words.length === 0}>
        {words.map((word, index) => <span key={`${word}-${index}`} className={`w${index < shown ? " on" : ""}`}>{word}</span>)}
      </div>
      <div className={`scene-cut ${tone}${cut ? " open" : ""}`} aria-hidden="true"><span>{cut}</span></div>
    </div>
  );
}
