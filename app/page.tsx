import Link from "next/link";
import "./landing.css";

const FEATURES = [
  ["✂️", "Corta los silencios", "Quita las pausas entre frases y conserva cada palabra que dijiste, en el mismo orden."],
  ["💬", "Captions palabra por palabra", "Subtítulos grandes y sincronizados con tu voz, paginados para que ninguna palabra pase sin leerse."],
  ["🎨", "Cortes a pantalla completa", "Tus frases clave ocupan toda la pantalla en color, resaltando la palabra que suena."],
  ["🖼️", "Gráficos detrás de ti", "Recortamos tu silueta para que las tarjetas de vidrio y los fondos queden detrás, sin taparte."],
  ["🌈", "Color según lo que dices", "Azul de base, verde cuando hablas de salud, rojo cuando hablas de estrés. Tú lo cambias por frase."],
  ["🔊", "Diseño sonoro", "Un efecto al arrancar, en cada cambio de toma y en cada gráfico, mezclados bajo tu voz."],
];
const FAQ = [
  ["¿Qué tipo de videos edita?", "Reels y TikToks verticales con una persona hablando a cámara, en español. Otros formatos e idiomas todavía no están probados."],
  ["¿Cuánto tarda?", "Analizar un video de un minuto toma unos cinco minutos y renderizarlo unos pocos más. Hoy se procesa un video a la vez."],
  ["¿Puedo cambiar lo que edita?", "Sí. En el editor eliges qué frases llevan corte de color, tarjeta o fondo, y de qué color. La vista previa cambia al instante."],
  ["¿Puedo ponerle una canción conocida?", "No dentro del archivo. Las canciones con derechos se agregan desde la biblioteca de Instagram o TikTok al publicar."],
  ["¿A dónde va mi video?", "La transcripción, el recorte y el render se hacen en nuestro propio equipo. Tu video no se envía a generadores de video externos."],
];

export default function Landing() {
  return (
    <div className="landing">
      <nav>
        <div className="wrap">
          <Link href="/" className="logo"><img src="/logo.png" alt="Pink.ai" /><b>Pink<span>.ai</span></b></Link>
          <a className="link" href="#funciones">Funciones</a>
          <a className="link" href="#como">Cómo funciona</a>
          <a className="link" href="#preguntas">Preguntas</a>
          <span className="grow" />
          <Link className="cta small" href="/app">Entrar</Link>
        </div>
      </nav>

      <header className="hero wrap">
        <img className="bird" src="/logo.png" alt="" />
        <div><span className="pill">Editor de video con IA para reels y TikTok</span></div>
        <h1>Sube tu video.<br />Recíbelo <em>editado.</em></h1>
        <p className="lead">Pink.ai corta los silencios, pone captions, gráficos y sonido con un estilo de creador. Tú ajustas cada frase en un editor tan simple como un documento.</p>
        <div className="actions">
          <Link className="cta" href="/app">Empezar a editar</Link>
          <a className="cta ghost" href="#como">Ver cómo funciona</a>
        </div>

        <div className="mock" aria-hidden="true">
          <div className="phone">
            <div className="glass"><i /><i /><i /><i /></div>
            <div className="head" /><div className="person" />
            <div className="caption">uno de cada cuatro</div>
          </div>
          <div className="pane">
            <h5>Toma 3 · 0:09</h5>
            <p>Escucha esto, <mark>uno de cada cuatro pacientes</mark> <u>que van al doctor tienen síntomas</u> de estrés o de ansiedad.</p>
            <h5>Toma 4 · 0:16</h5>
            <p>Y lo que mucha gente no sabe es que el estrés <mark>no solamente se queda en tu cabeza.</mark></p>
          </div>
          <div className="pane">
            <h5>Elementos</h5>
            <div className="el green"><small>Tarjeta</small>uno de cuatro</div>
            <div className="el blue"><small>Corte de color</small>van al doctor</div>
            <div className="el"><small>Fondo</small>emergencia</div>
          </div>
        </div>
      </header>

      <section id="funciones">
        <div className="wrap">
          <h2>Todo lo que hace un editor, en un solo paso</h2>
          <p className="sub">Seis cosas que normalmente toman horas en una línea de tiempo.</p>
          <div className="cards">
            {FEATURES.map(([icon, title, text]) => (
              <div className="card" key={title}><div className="ico">{icon}</div><h3>{title}</h3><p>{text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="split">
            <div><h3>Edita como si fuera un documento</h3><p>Tu video aparece como texto, toma por toma. Haces clic en una palabra para ir a ese momento y eliges una frase para darle énfasis. Sin línea de tiempo.</p></div>
            <div className="panel"><div className="line">Cuando vives estresado, tu cuerpo entra en un <mark style={{ background: "linear-gradient(transparent 62%, rgba(239,92,138,.45) 62%)" }}>modo de emergencia</mark> y tu presión sube.</div></div>
          </div>
          <div className="split">
            <div className="panel">
              <div className="swatch" style={{ background: "linear-gradient(150deg,#174a9c,#3b82e6)" }}>INVESTIGAR</div>
              <div className="swatch" style={{ background: "linear-gradient(150deg,#157a43,#3fc47e)" }}>VAN AL DOCTOR</div>
              <div className="swatch" style={{ background: "linear-gradient(150deg,#a82424,#f06a6a)" }}>ENFERMEDAD</div>
            </div>
            <div><h3>El color acompaña lo que dices</h3><p>Cada corte, tarjeta y fondo toma el color del tema del momento. Lo que ves en la vista previa es exactamente lo que se renderiza.</p></div>
          </div>
        </div>
      </section>

      <section id="como">
        <div className="wrap">
          <h2>Tres pasos</h2>
          <p className="sub">De tu grabación sin editar al MP4 listo para publicar.</p>
          <div className="steps">
            <div className="step"><h3>Sube tu video</h3><p>Lo transcribimos, cortamos los silencios y recortamos tu silueta. Tarda unos minutos.</p></div>
            <div className="step"><h3>Ajusta la edición</h3><p>Elige qué frases llevan corte de color, tarjeta o fondo y mira el resultado en vivo.</p></div>
            <div className="step"><h3>Descarga</h3><p>Renderizamos en vertical 1080 × 1920 con el audio normalizado para redes.</p></div>
          </div>
        </div>
      </section>

      <section id="preguntas" className="band">
        <div className="wrap">
          <h2>Preguntas frecuentes</h2>
          <p className="sub">Lo que conviene saber antes de subir tu primer video.</p>
          {FAQ.map(([question, answer]) => (<details key={question}><summary>{question}</summary><p>{answer}</p></details>))}
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>Tu próximo reel, editado</h2>
          <p className="sub">Sube una grabación y mira lo que sale.</p>
          <Link className="cta" href="/app">Empezar a editar</Link>
        </div>
      </section>

      <footer><div className="wrap"><img src="/logo.png" alt="" width={24} height={24} /><span>Pink.ai</span><span className="grow" /><span>Hecho para creadores</span></div></footer>
    </div>
  );
}
