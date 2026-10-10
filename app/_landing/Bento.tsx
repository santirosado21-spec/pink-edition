import { Reveal } from "./Reveal";

const BARS = [8, 18, 30, 22, 36, 14, 4, 4, 4, 4, 26, 34, 20, 38, 12, 4, 4, 4, 28, 36, 24, 16, 32];

function Silence() {
  return (
    <svg viewBox="0 0 230 112" role="img" aria-label="Una onda de voz con pausas que se quitan">
      {BARS.map((h, i) => <rect key={i} x={i * 10 + 2} y={45 - h} width="6" height={h * 2} rx="3" className={h <= 4 ? "gap" : "voice"} />)}
      <text x="2" y="106">Quitamos las pausas, no tus palabras.</text>
    </svg>
  );
}

export default function Bento() {
  return (
    <div className="bento">
      <Reveal className="tile t-wide"><div className="vis vis-silence"><Silence /></div><h3>Cortes sin habla</h3><p>Quita los momentos sin voz y conserva cada palabra, en el mismo orden.</p></Reveal>
      <Reveal className="tile t-wide" delay={80}>
        <div className="vis vis-caps" aria-hidden="true"><span>tus</span><span>palabras</span><span>a tiempo</span></div>
        <h3>Subtítulos sincronizados</h3><p>Grandes, con una sola tipografía y una palabra tras otra, como suenan.</p>
      </Reveal>
      <Reveal className="tile"><div className="vis vis-graphics" aria-hidden="true"><i className="g-blue" /><i className="g-green" /><i className="g-red" /></div><h3>Gráficos con sentido</h3><p>Cortes de color, tarjetas y fondos ligados a lo que dices.</p></Reveal>
      <Reveal className="tile" delay={80}><div className="vis vis-sound" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}</div><h3>Sonido que acompaña</h3><p>Efectos en los cortes y en cada gráfico, sin tapar tu voz.</p></Reveal>
      <Reveal className="tile" delay={160}><div className="vis vis-vertical" aria-hidden="true"><b>9:16</b></div><h3>Pensado en vertical</h3><p>Contenido corto, listo para Reels, TikTok y Shorts.</p></Reveal>
    </div>
  );
}
