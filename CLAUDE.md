# Pink Edition / Pink.ai — instrucciones compartidas

Leer `AGENTS.md`, `README.md`, `docs/EDITING_GUIDELINES.md`,
`style/pink-demo-v1.json` y `projects/piscina/plan.json` antes de editar.
La demo de piscina conserva todas las intervenciones en orden y sólo recorta
tramos sin habla. No volver a una selección de 17 segundos.

`src/FullDemo.tsx` registra la composición `PinkEdit` y el alias `PoolFullDemo`;
recibe `{style, plan, timeline, media}`. `src/edit.ts` construye el contexto.
STYLE fija el look y las reglas reutilizables; PLAN contiene las decisiones del
video y sigue `schema/edit-plan.schema.json`.

El plan de piscina usa seis tarjetas; `src/graphics/cards.tsx` registra trece
clases (`docs/CARD_CATALOG.md`). Hay cortes de color, fondos temáticos y temas contextuales. Los SFX se
derivan de STYLE en `src/SoundDesign.tsx`; no hay música (se agrega al
publicar).

Mantener Inter Display Bold a 100 px uniformes. Los captions usan normalmente
hasta cuatro palabras y admiten cinco para evitar una última palabra visible por
menos de ocho frames. Mantener rostro y captions libres. Los gráficos ilustran
lo dicho: no inventar cifras, trazados clínicos ni CTA, ni reutilizar los
generadores de ECG o audio procedural rechazados.

`scripts/make_matte.py` crea el recorte de persona y
`scripts/place_graphics.py` coloca tarjetas a partir del matte. Consultar
`docs/EDITING_GUIDELINES.md` para las reglas editoriales, `PINK_AI.md` para la
plataforma y `supabase/migrations/` para el modelo persistente.

El creador contesta una vez un cuestionario de estilo (`/estilo`); sus respuestas
viajan en `plan.preferences` y `src/preferences.ts` las aplica sobre STYLE (color de
marca, sonido). Sin preferencias el resultado es el estilo de la casa.

La web (`app/`) tiene modo local y modo nube (Supabase) y el procesador es
`scripts/worker.py`; ver `README.md` y `PINK_AI.md`. La clave de servicio de
Supabase y la de Anthropic sólo viven en el entorno del procesador o de la web,
nunca en Git ni en el navegador.

Excepción: `public/landing/` contiene los clips de la demo que muestra la landing y
`public/estilo/` los ejemplos del cuestionario de estilo, ambos del video de piscina.
El dueño pidió usar el video real el 10 de octubre de 2026 y aprobó los ejemplos el
12; se asume que tiene permiso de quien aparece. No añadir más material del cliente a Git. En la web no hacer
animaciones ni demos ilustradas: se muestra el video real.

Los videos y transcripts del cliente permanecen locales y fuera de Git. Los
datos ficticios permiten revisar código y gráficos sin distribuirlos. No leer
archivos de credenciales ni añadirlos al repositorio.

Trabajar en una rama propia, revisar el diff y preservar cambios de otros.
Validar con `npm run typecheck`; para una entrega, renderizar y pasar QC de audio,
duración, cobertura de palabras y decodificación completa. Separar ese QC técnico
de la aprobación estética. No realizar generaciones facturables por defecto.
