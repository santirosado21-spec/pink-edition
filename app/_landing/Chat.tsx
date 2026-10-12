const MESSAGES: { from: "me" | "pink"; text: string }[] = [
  { from: "me", text: "Baja los efectos de sonido." },
  { from: "pink", text: "Listo, ahora acompañan sin tapar tu voz." },
  { from: "me", text: "Quita ese gráfico." },
  { from: "pink", text: "Quitado. El resto queda igual." },
  { from: "me", text: "Mantén todo lo que digo y corta solo las pausas." },
  { from: "pink", text: "Hecho: tus palabras siguen en el mismo orden." },
  { from: "me", text: "Usa la misma tipografía en todo el video." },
  { from: "pink", text: "Ya está: una sola letra, del principio al final." },
];

// Conversación de ejemplo, estática.
export function Chat() {
  return (
    <div className="chat" role="log" aria-label="Conversación de ejemplo">
      <span className="chat-tag">Demostración</span>
      {MESSAGES.map((message, index) => <p key={index} className={`bubble ${message.from}`}>{message.text}</p>)}
      <div className="chat-input" aria-hidden="true"><span>Escribe qué quieres cambiar…</span><b>↑</b></div>
    </div>
  );
}
