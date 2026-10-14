# 06 · Cinco pruebas de concepto y plan de ejecución

Ordenadas por retorno esperado (calidad × diferenciación ÷ complejidad, ver `05-matriz.md`).
Cada prueba vive en la rama `claude/plataforma-v2` y se entrega con pull request **sin
fusionar** hasta que el dueño la revise. Reglas comunes: sin preferencias ni efectos
nuevos el video de piscina debe salir idéntico (cuadros y audio); `npm run typecheck`,
build de producción y QC deben pasar; los efectos nuevos son parámetros de STYLE o
eventos de PLAN anclados a palabras.

| # | Prueba | Depende de | Estado |
| --- | --- | --- | --- |
| 1 | Primera edición automática con Style DNA | `ANTHROPIC_API_KEY` | Bloqueada: falta la clave |
| 2 | Presets de subtítulos | — | Hecha: plan e inspección aprobados por Codex; PR abierto sin fusionar |
| 3 | Zooms y transiciones con sonido | — | Pendiente |
| 4 | Edición por transcripción | — | Pendiente |
| 5 | Estilo desde un video de referencia | — (la visión con Claude necesita la clave) | Pendiente |

## POC 1 · Primera edición automática con Style DNA

- **Hipótesis:** con el cuestionario y el catálogo, Claude propone un plan que el
  creador conserva en su mayoría.
- **Alcance:** correr `scripts/propose_smoke.py` sobre piscina e interiores con tres
  perfiles distintos; medir qué porcentaje de elementos queda tras revisión humana.
- **Éxito:** al menos 70 % de los elementos propuestos se conservan; cero violaciones
  de reglas (cifras no dichas, solapes, densidad).
- **Costo:** unas pocas llamadas a la API por video. **Duración:** 1–2 días con la clave.

## POC 2 · Presets de subtítulos

- **Hipótesis:** un catálogo pequeño de estilos de subtítulos cierra la brecha más
  visible frente a Submagic y OpusClip.
- **Alcance:** `style.captions.preset` con tres valores. «Pink» es el actual.
  «Palabra clave» resalta en color de marca, con un leve aumento, las palabras que
  marque el plan o, si no hay, la palabra activa. «Karaoke» rellena el color palabra
  por palabra. Nueva pregunta o paso en el cuestionario, clip de ejemplo de cada uno.
- **Éxito:** los tres se renderizan; legibles en revisión de cuadros; piscina sin
  preset sale idéntica; QC pasa.
- **Duración:** 2–3 días.

## POC 3 · Zooms y transiciones con sonido

- **Hipótesis:** el ritmo visual (la referencia que le gusta al dueño cambia de plano
  cada 2.2 s; nuestro v9 cada 5.9 s) se puede subir sin cortar palabras, con zooms en
  palabras de énfasis y transiciones en los cambios de toma.
- **Alcance:** eventos `zooms` en el PLAN (anclados a palabra; escala y duración
  acotadas, centrados en el rostro estimado desde el recorte) y transición configurable
  en STYLE para cada cambio de toma, con su efecto de sonido. Preferencia «ritmo».
- **Éxito:** ritmo medido con el mismo detector entre 2.5 y 4 s por cambio en el modo
  dinámico; el rostro nunca sale del cuadro; QC pasa; sin zooms, piscina idéntica.
- **Duración:** 3–4 días.

## POC 4 · Edición por transcripción

- **Hipótesis:** borrar palabras desde el texto es la forma más natural de corregir, y
  nuestro montaje por palabras ya lo permite.
- **Alcance:** lista `excluded_word_ids` en el PLAN; el corte recalcula tomas sin esas
  palabras y sin cortar palabras a la mitad; en el editor, seleccionar texto y
  «Quitar». Los eventos anclados a palabras quitadas se mueven o se avisan.
- **Éxito:** quitar una frase produce un video sin ella, sin saltos de audio audibles
  (márgenes de 0.22/0.28 s), con QC de palabras ajustado a las que quedan.
- **Duración:** 3–4 días.

## POC 5 · Estilo desde un video de referencia

- **Hipótesis:** se puede medir el estilo de un video que le guste al creador y
  prellenar su Style DNA.
- **Alcance:** `scripts/analyze_reference.py`: ritmo de cambios de plano, zooms
  (cambio de escala entre cuadros), densidad de efectos de sonido (picos de audio sin
  voz), zona y tamaño de subtítulos (diferencias en la franja inferior), colores
  dominantes. Salida: un perfil y las preferencias sugeridas. La lectura visual con
  Claude se agrega cuando haya clave.
- **Éxito:** sobre la referencia «Philipe AI» y nuestro v9 produce perfiles distintos y
  coherentes con lo observado (2.2 s frente a 5.9 s por cambio).
- **Duración:** 3–5 días.

## Plan de ejecución

1. **Ahora, sin depender de nadie:** POC 2 → POC 3 → POC 4 → POC 5, en ese orden, cada
   una con su plan revisado por Codex (claudex) antes de construir y su inspección
   cruzada al terminar.
2. **En paralelo, del lado del dueño:** la clave de Anthropic (desbloquea la POC 1 y la
   parte visual de la 5), exportaciones del mismo video desde Submagic o CapCut para
   comparar, mover el proyecto fuera de iCloud, y apagar el registro en Supabase.
3. **Después de las POC:** cola de varios videos, recorte más rápido, vista previa en
   iPhone y aprendizaje de preferencias por correcciones.

## Registro de avance

Esta sección se actualiza al cerrar cada prueba (fecha, pull request, resultado medido).

### POC 2 · Presets de subtítulos — 14 de octubre de 2026

- Plan revisado por Codex (GPT-6 Astra, esfuerzo alto) en 4 rondas: 4 hallazgos de
  severidad media, todos aceptados. Alcance de «keyword», límite atómico de 40 en el
  editor, QC de entrega completa y procedimiento de copia del trabajo de prueba.
  Aprobado.
- Construido por Claude: preferencia opcional `captions` (`pink`, `keyword`, `karaoke`),
  `plan.emphasis_word_ids`, paso «Subtítulos» en el cuestionario con tres clips reales,
  «★ Resaltar» en el editor, palabras clave en la propuesta automática.
- Verificado:
  - Piscina sin preset: 10 cuadros y 10 s de audio idénticos a la versión anterior.
  - QC de entrega completa con `keyword` y con `karaoke`: pass, 158/158 palabras,
    −14.01 LUFS.
  - 13 pruebas de validación en Python y TypeScript.
  - Casos del editor: 39→40, rechazo de 40→41, quitar en 40, rechazo de 51 y de
    selecciones mixtas.
  - Cuestionario a 1440 y 390 px sin animaciones.
  - Build de producción.
- Inspección del código por Codex en sesión nueva. La primera pidió 4 cambios (validación
  estricta de `emphasis_word_ids`, validar el plan en `pink_edit.py` antes del recorte,
  que la propuesta sustituya las palabras clave, y dos palabras elegidas en el
  ejemplo); se aplicaron todos. La segunda aprobó sin hallazgos.
- Pendiente estético: con un color de marca oscuro (el azul por defecto) la palabra
  resaltada contrasta menos sobre cielo claro; valorar usar la versión clara de la
  paleta o un contorno.
