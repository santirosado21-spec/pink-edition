# Pink Edition — instrucciones compartidas

Leer `AGENTS.md`, `README.md` y `full-demo-config.json` antes de editar.
El objetivo es editar footage real con captions y gráficos contextuales.
La demo completa de piscina conserva todas las intervenciones en orden;
sólo se quitan tramos sin habla. No volver a una selección de 17 segundos.

La composición activa es `src/FullDemo.tsx`. `src/EditorialGraphics.tsx` monta
siete tarjetas vectoriales de `src/graphics/cards.tsx` sobre el vidrio de
`src/LiquidGlass.tsx`; `src/SoundDesign.tsx` pone un SFX al inicio, uno en cada
corte de toma y los de las tarjetas. Mantener Inter Display Bold,
un solo tamaño de 100px, rostro libre y captions separados de las tarjetas.
Los gráficos ilustran lo dicho; no añadir cifras o trazados clínicos inventados.
No reutilizar los generadores de ECG y audio procedural rechazados.

Los videos y transcripts del cliente permanecen locales, excluidos de Git.
Los datos ficticios del arranque permiten revisar código y gráficos sin ellos.
No leer archivos de credenciales ni añadirlos al repositorio.

Trabajar en una rama propia, revisar el diff y preservar cambios de otros.
Validar con `npm run typecheck`; para una entrega, renderizar y pasar QC de audio,
duración, cobertura de palabras y decodificación completa. No afirmar que un
render es comparable al demo sólo porque pasa QC técnico.

Estado: Remotion 4.0.534; demo de 53.3s (v6) con tarjetas liquid glass y SFX
elegidos por medición, pendientes de aprobación de oído; Higgsfield opcional
y actualmente sin usar. No realizar generaciones facturables por defecto.
