# Umbral — estilo adicional 001

19 de octubre de 2026. Preferencia explícita del usuario: la combinación completa del demo Mogul. Se introduce una composición local independiente, sin cambiar los planes de los videos existentes ni el perfil de los clientes. La tipografía variada se aplica a esta exploración de estilo solicitada.

## Decisión de producto — 19 de octubre de 2026

El usuario aprueba visualmente este muestrario («se ve bien») como otro estilo, sin sustituir el estilo previamente definido ni convertirlo en predeterminado. Nombre propio de trabajo: **Umbral**. La aprobación visual no equivale a validación de edición autónoma ni de audio.

Identidad: contraste monocromo, acentos de color, contraste tipográfico sans/manuscrita, diagramas progresivos, detalles señalados y mosaicos. Estas piezas se pueden seleccionar por marca o por video; aprobar la muestra no autoriza aplicarlas globalmente.

Convención para el catálogo: nombres propios para nuestros estilos, sin reutilizar los nombres comerciales de Phillipe. Las referencias al competidor se conservan únicamente como procedencia de investigación. Los identificadores técnicos `CinematicStyleLab` y `CinematicStyleLabVertical` permanecen por compatibilidad con las vistas previas existentes; no son el nombre comercial del estilo.

## Entrega

Vista previa de 20 s/600 frames, 30 fps. CinematicStyleLab (1920×1080) y CinematicStyleLabVertical (1080×1920), más seis escenas conectadas para inspección individual. B-roll monocromo, énfasis sans/script, diagrama progresivo, callout, mosaico y cierre claro. Texto sintético sobre mirar/elegir/contar; no es una transcripción ni un trabajo automático sobre Fran. Color de acento y monocromo editables en los props de Studio. Las fuentes son Inter Display Bold existente e Italianno OFL local. El montaje es una muestra dirigida por código.

## Recursos

Tres clips Pexels descargados para crear la muestra. Procedencia, URLs de descarga, licencia y hashes: public/style-lab/PROVENANCE.json. Italianno-OFL.txt junto a la fuente. Audio de síntesis original, 20 s, volumen 0.55, sin samples externos. No se reutiliza metraje ni audio del demo del competidor. No hay solicitudes a modelos externos.

## Revisión

- npm run typecheck: correcto tras cambios de código.
- 12 stills de seis escenas en ambos formatos generados por Remotion; revisión visual de los dos mosaicos de control y detalles. Detectados/corregidos letterboxing en vertical (objectFit) y flechas recortadas (viewBox vertical específico). Las seis capturas verticales se regeneraron tras la corrección.
- Studio carga ambas composiciones, sus controles y escenas; sin error visible en las consultas realizadas. No se ha medido fluidez sostenida de reproducción ni auditado cada frame.
- work/style-lab/ contiene imágenes, still-checks.json y audio-qc.json. Audio sin clipping, peak -20.99 dBFS y RMS -31.52 antes de ganancia; escucha estética pendiente.
- graphify update . completado; avisos de extractores SQL/Solidity y errores de sintaxis preexistentes en archivos ajenos.
- Studio avisa de Zod 4.6.5 existente frente a 4.5.4 recomendado por Remotion. TypeScript y las capturas pasan; no se cambiaron dependencias compartidas para esta muestra.

## Revisar localmente

Desde motion: npx remotion studio src/index.ts --no-open --port=3010

Horizontal: http://localhost:3010/CinematicStyleLab
Vertical: http://localhost:3010/CinematicStyleLabVertical

No se exportó un MP4 en esta entrega: la vista previa permite ajustar el estilo primero. La selección automática por frase, búsqueda automática de B-roll y perfiles por marca siguen siendo trabajo posterior. Siguiente paso: aplicar las piezas visuales aprobadas a un original real cuando se seleccione Umbral para ese video, con QC de voz y posiciones y revisión de audio.

## Biblioteca ampliada de referencias

El archivo `style/reference-library-v1.json` reúne ocho referencias y veintisiete recetas en las familias Umbral, Bitácora, Estampa, Pulso y Enlace. Los nombres son propios y las cuatro familias nuevas son propuestas de trabajo, sin aprobación de marca ni asignación predeterminada. Cada receta vincula evidencia temporal aproximada, criterio de uso, casos donde evitarla, parámetros propuestos y estado real de implementación.

Cinco recetas de Umbral cuentan con componentes del muestrario; veintidós están especificadas para implementación. Ninguna de estas veintisiete recetas se ofrece todavía al selector editorial automático. El catálogo operativo `style/catalog-v1.json` y los perfiles existentes no se modificaron. Los parámetros de nuevas recetas son valores de diseño propuestos, no mediciones exactas ni identificación de fuentes del original. Los cuatro tutoriales cuentan con transcripción local; la escucha estética y la sincronización musical siguen pendientes de revisión.

## Consejos de edición extraídos de la quinta referencia

ASR local offline con Whisper-small y revisión de muestras visuales del video de 37,3 s. `work/references/snaptik-7559598746233883960/analysis.json` conserva cinco reglas candidatas, límites y prioridades. El catálogo añade tres recetas: gancho de dos niveles, entrada suave/marcada y texto alrededor de una región. Se propone concentrar la edición de texto en la apertura y un momento intermedio, ajustar escala/posición y usar acentos por marca. Son opciones por estilo y por video; no reglas globales. No hay evidencia de mejora de retención ni identificación exacta de fuentes/presets. La transcripción automática tiene errores localizados y no se presenta como cita verificada.

## Continuidad y fundamentos de captura — referencias sexta y séptima

Dos videos en inglés de 75,46 y 79,00 s: revisión visual, detalles y ASR local offline en idioma inglés. Informes privados en `work/references/snaptik-7635521642168438030/analysis.json` y `work/references/snaptik-7593043805004172551/analysis.json`. La primera transcripción generada con el helper fijo en español quedó marcada como sustituida; sólo `transcript-en.json` es canónica para estos informes.

Se incorporan seis recetas especificadas bajo Enlace: continuidad de gesto, guía de movimiento, demostración dentro del dispositivo, capítulo de alto contraste, concepto con ejemplo y guía de encuadre. Se añaden seis reglas candidatas de continuidad, cobertura, iluminación, altura de cámara, composición y exposición. Total al incorporar esas dos referencias: siete referencias, cinco familias, veinticuatro recetas y once reglas candidatas. Ninguna nueva receta tiene aún componente ni selección automática.

La continuidad exige ángulos reales y modo de montaje explícito; no autoriza recortar/reordenar voz en la demo actual. Se documenta que la segunda referencia dice horizontal mientras muestra una guía vertical. Las guías de encuadre y la iluminación son opciones de captura, no exigencias universales ni sustitutos de calidad de fuente.

## Análisis conjunto de los cuatro tutoriales

La octava referencia, `snaptik_7599720559177403660_v3.mp4` (80,70 s), aporta siete pasos de edición. Se revisaron muestras visuales cada 3 s, detalles de recursos cada segundo y la transcripción local del audio completo, detectado en inglés. Informe: `work/references/snaptik-7599720559177403660/analysis.json`. Síntesis de los cuatro tutoriales: `work/references/tutorials-synthesis-2026-10-19.json`.

| Tutorial | Aporte para Cutkind | Condición de aplicación |
| --- | --- | --- |
| Texto y énfasis | Jerarquía, posición y dos intensidades de entrada | Depende de la marca y del mensaje; apertura/mitad no garantiza retención. |
| Continuidad | Corte sobre acciones compatibles y cobertura planificada | Requiere tomas reales compatibles; conservar la voz protegida. |
| Captura | Iluminación, encuadre y exposición antes de editar | Tercios, simetría y altura de cámara son opciones, no mandatos. |
| Siete pasos | Narrativa, silencios, música, B-roll, tipografía y color | Recursos pertinentes y con procedencia; no adoptar opiniones sobre software como requisitos. |

El cuarto tutorial añade tres recetas: ruta numerada de pasos, objeto literal recortado y pila de recursos. También añade evidencia a cuatro recetas existentes, sin duplicarlas. Se incorporan seis reglas candidatas: silencios con intención, significado antes de decoración, música por intención y procedencia, B-roll semántico, procedencia de fuentes/plantillas y balance antes del look. Biblioteca actual: **ocho referencias, cinco familias, veintisiete recetas y diecisiete reglas candidatas**. Cinco recetas tienen vista previa; veintidós están especificadas. Todas siguen sin soporte en el selector automático.

Orden propuesto: conectar Qwen al contrato de propuesta con perfiles y validación; construir y previsualizar títulos, entradas, capítulos y ventanas de B-roll; incorporar selección semántica y mezcla; introducir continuidad cuando haya cobertura; evaluar propuestas A/B en originales nuevos. La personalización controla intensidad, fuentes, colores, densidad de recursos y ritmo por marca/video. Umbral conserva su aprobación como estilo adicional; las nuevas referencias no cambian preferencias globales.

Se descarta convertir en regla el rechazo a CapCut del narrador. Tampoco se adopta su flujo de descarga de canciones de YouTube. Las licencias se verifican por recurso y destino. Para color se propone balance y coherencia entre tomas antes del tratamiento creativo, en lugar de mover controles sin criterio. Estos análisis no demuestran mejoras de retención ni equivalen a una prueba de edición autónoma.
