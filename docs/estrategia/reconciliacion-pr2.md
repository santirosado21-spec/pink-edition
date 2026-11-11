# Reconciliación del PR #2 (claude/autonomous-progress) con plataforma-v2

Noviembre de 2026. Revisión commit a commit del PR #2 contra la línea activa
(`claude/plataforma-v2`). El merge directo producía nueve conflictos, así que se
hizo un port semántico: cada pieza se evaluó contra lo que ya existe y se integró
adaptada o se descartó documentada. Todo quedó en la rama local `reconcile-pr2`;
ningún merge remoto sin revisión del dueño.

## Integrado (adaptado a la arquitectura v2)

1. **«Pedir un cambio» (revisión por instrucción)** — commit `e97655a`.
   El PR #2 lo resolvía con Anthropic; v2 usa Sol (sesión local de ChatGPT), así
   que `revisePlan` se reescribió sobre `requestSolProposal`: la edición actual
   viaja serializada al formato de propuesta (`planToProposal`) y la respuesta
   completa se valida con las mismas reglas editoriales que proponer
   (`evaluateProposal` sobre la edición vacía: rangos, mínimos, cifra literal en
   counter, densidad, preferencias). Zooms, estilo y versión se conservan.
   Ruta `POST /api/jobs/[id]/revise` con la seguridad de v2 (sameOrigin, borrador
   validado, conflicto de versión, bloqueo durante render, candidato en el
   historial). El campo del editor, que era un marcador deshabilitado, quedó
   operativo. Puerta 14 (`test_revise.mjs`).
2. **Temas money y tech** — commit `8c98c89`. Ámbar para dinero/negocios y
   violeta para tecnología: paleta del estilo, enum del esquema en los tres
   grupos, variables CSS del editor (claro y oscuro), etiquetas del selector,
   mapeo al color de marca sin colores por contexto y catálogo en el mensaje al
   modelo.
3. **Pruebas de la cola del procesador** — commit `1883001`. Su
   `tests/test_worker.py` se adaptó a la cola de v2 como
   `scripts/test_worker_queue.py`: flujo analyze→render con motor falso, motivo
   de fallo conservado, video editable tras render roto, límite de reintentos y
   nombre de procesador estable persistido. Puerta 15.
4. **CI ampliado** — commit `1883001`. Su Check.yml corría sus pruebas; el de v2
   sólo hacía typecheck. Ahora también build web, las cinco pruebas node de
   lógica pura y las trece pruebas python sin medios (lista explícita: discover
   recogería utilidades que no son pruebas). Catálogo de marca (audio) y tinta
   del resaltado (render) quedan en las puertas locales.
5. **QA sintético** — commit `22aa8be`. Su `synthetic_qa.py` generaba stills con
   video ficticio para revisar tarjetas al frente; se portó como
   `scripts/render_theme_qa.mjs` verificando píxeles de los temas nuevos (corte
   sólido, corte de papel y tarjeta por tema), con medición de cara sintética:
   sin ella `safeCardTop` no encuentra hueco y la tarjeta no sale. Puerta 16
   (`test_themes.mjs`).

## Descartado (ya cubierto u obsoleto en v2)

1. **Reencolado del procesador (host@pid)** — v2 ya lo resuelve mejor: nombre
   estable persistido en `work/.worker-name` (o `PINK_WORKER_NAME`) y requeue por
   igualdad exacta, sin depender del nombre de red del equipo. La prueba portada
   cubre este comportamiento.
2. **`proposalRules.ts` (enforceRules)** — cubierto y superado por
   `evaluateProposal` de v2: mínimos por elemento, solapes, densidad por ventana,
   contador con cifra literal (`numericTokens`), compare con comparación
   explícita, límites por preferencias y conservación de lo existente.
3. **Tarjetas por delante de la persona (capa frontal + face_height)** — v2
   eliminó la superposición del recorte: la mate sólo se usa para medir
   (`safeCardTop`/`protectedHead` colocan la tarjeta en hueco seguro). La capa
   frontal ya no tiene dónde vivir.
4. **`docs/COSTOS.md`** — documentaba costos de la API de Anthropic; v2 edita con
   Sol sin costo por token. No aplica.
5. **`tests/proposal.test.ts`, `fixtures.ts`, `tsconfig.test.json`, `npm test`** —
   probaban su proposalRules/propose con Anthropic. v2 cubre esa superficie con
   las puertas node existentes más las nuevas (revisión, temas).
6. **Su `Editor.tsx`, `propose.ts`, `propose/route.ts`, `PinkEdit.tsx`, `edit.ts`,
   `place_graphics.py`, `EditorialGraphics.tsx`** — versiones anteriores a la
   reorganización de v2 (candidatos, borradores, Sol, preferencias); sólo se
   extrajo lo listado arriba.

## PR #5 y el resto de ramas (revisión del 10 de noviembre)

- **PR #5 (`claude/estrategia`)**: es ancestro de `claude/plataforma-v2`
  (`git merge-base --is-ancestor`): no tiene ningún commit que falte en la línea
  activa. No hubo nada que portar; puede cerrarse sin pérdida.
- **`claude/data-driven-review` y `claude/style-quiz`**: igualmente ancestros de
  la línea activa; nada pendiente.
- **face_height y el catálogo de tarjetas genéricas**: la colocación por altura
  de cara ya vive en `safeCardTop`/`protectedHead` (medición de cara, zoom,
  punch y desenfoque incluidos); la expansión del catálogo con composiciones
  genéricas (cita, concepto, lista) está en `edicion-real-2026-10-19/PLAN.md`
  pero el proceso del proyecto la reserva a huecos detectados en rondas
  puntuadas (F3), hoy bloqueadas por el dueño: no se adelanta por especulación.
- Del PR #2 también se portó la guía editorial de los temas money/tech en
  `docs/CARD_CATALOG.md`. Sus cambios en README/PINK_AI.md/.gitignore/package.json
  describen su propia infraestructura de pruebas (Anthropic, `npm test`), ya
  cubierta por las puertas de `pink_loop.py`: no aplican.

## Pendiente del dueño (sin cambios)

El merge de los PR #2/#5/#6 en el remoto sigue siendo decisión del dueño. Con
esta reconciliación, el PR #2 ya no contiene nada que falte en la línea activa:
puede cerrarse cuando el dueño lo revise. El PR #5 puede cerrarse directamente:
está contenido en la línea activa.
