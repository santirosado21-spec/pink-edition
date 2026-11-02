# Investigación: autonomía basada en el estilo del creador

15 de octubre de 2026 · Investigación y propuesta; no lanzamiento de funciones.

## Conclusión

La ventaja defendible debe ser una memoria editorial verificable: qué quiere cada creador, en qué contexto, de dónde sale cada regla y cómo cambió tras una corrección. Una galería de presets, colores y fuentes es una base útil, pero ya existe en productos establecidos. Conservar el motor actual y construir resolución de preferencias, registro de decisiones y control de calidad aporta más que reemplazarlo por otro editor o instalar muchas skills.

Se puede preparar esa infraestructura sin las nuevas grabaciones. La calidad del gusto, la transferencia desde referencias y la aceptación sin retoques requieren los ejemplos que aportará el usuario. Los plazos anteriores de semanas eran orientativos, no medidos; esta investigación propone puertas de aceptación en lugar de una fecha prometida.

Plan ejecutable: [PLAN.md](PLAN.md). Evidencia y límites: [VALIDACION.md](VALIDACION.md). Registro de Claude: [CLAUDEX-LOG.md](CLAUDEX-LOG.md).

## Lo que cambió después de la revisión de Claude

Claudex completó una revisión con modelo observado `claude-opus-5-5`. La primera ronda pidió revisar el plan y aportó 14 hallazgos. Se aceptaron como requisitos del plan; no significa que el código ya esté corregido. Los más importantes para el siguiente trabajo son:

- **Perfil inválido:** hoy el worker puede omitir preferencias inválidas y continuar. Una migración de perfiles podría provocar edición con defaults que contradiga al creador. Primero detener de forma explícita y compatible, después ampliar el perfil.
- **Restricciones incompletas:** densidad por ventana y solapes están en el prompt, pero no se imponen determinísticamente. Deben pasar a reglas ejecutables con fixtures negativos.
- **Correcciones protegidas:** re-proponer sustituye listas de eventos. Hace falta procedencia/locks y conservar los ajustes explícitos del usuario.
- **Cobertura de voz:** VAD sólo en mixto, umbral de 1.2 s y aviso sin gate de entrega. Extender a fuente/salida en todos los idiomas antes de declarar autonomía.
- **Nube y coste:** stages nuevos, límites de perfil y cuotas necesitan contrato compatible y presupuesto reservado en servidor/worker, no sólo botones o rutas web.

El resultado desplaza la prioridad inmediata hacia fidelidad al perfil y observabilidad. La segunda revisión del documento y su resultado están en el log; la revisión de texto no certifica calidad audiovisual.

## Qué comprobamos en nuestro proyecto

El contrato STYLE/PLAN, renderer parametrizable, snapshots de preferencias y alineación por palabra permiten extender el sistema sin rehacerlo. El cuestionario actual tiene ocho pasos y soporta marca, idioma, vocabulario, tipo de edición, tipografía, captions, gráficos, colores, sonidos y transiciones. Guarda opciones; todavía no registra la procedencia de una regla ni aprende de correcciones.

Hay dos separaciones importantes:

1. Capacidad del renderer no equivale a decisión autónoma. Fotos, zooms, propuesta y render tienen intervenciones separadas. El worker de análisis llega a `ready_to_edit`; una nueva entrada sin plan parte de un plan vacío.
2. Un QC técnico aprobado no equivale a calidad editorial. El modo mixto preserva audio y registra revisión necesaria. El sistema puede conservar todas las palabras que reconoció y aun así haber omitido habla en la transcripción.

Ya existe VAD mediante `faster_whisper.vad` en `scripts/transcribe.py:129`, recuperación acotada de voz sin texto y muestras de captions/gráficos en `scripts/review_frames.py`. Debemos extenderlos y medirlos antes de instalar alternativas. `scripts/place_graphics.py` calcula espacio sobre la persona y emite un aviso cuando no cabe; el aviso por sí mismo no es una política de reparación o bloqueo de entrega. Es una prioridad para QC visual.

La sugerencia libre «no uses rojo» se almacena en `notes` y se pasa al modelo como gusto; no constituye hoy una prohibición tipada comprobada en el render. Este ejemplo explica por qué hace falta un compilador de restricciones, no sólo un prompt más largo. Revisar cada regla ofrecida en UI contra sus consumidores y su efecto final.

## Sistemas de referencia e inspección

| Sistema | Evidencia utilizada | Qué aprender | Límite de la conclusión |
|---|---|---|---|
| [Captions AI Edit](https://captions.ai/help/guides/advanced/ai-edit-styles) | Documentación oficial + Playwright y REA sobre [catálogo público](https://captions.ai/styles) | Vocabulario visual, agrupación por uso, muestra previa y ajustes por toma. Probar distintas decisiones sobre el mismo clip. | Observación del frontend público. No acceso a su planificador, modelos, lógica privada ni edición autenticada. |
| [OpusClip Brand Templates](https://www.opus.pro/brand-templates) | Descripción oficial de producto | Aplicación consistente de fuentes, colores, logos, vocabulario y plantillas a proyectos futuros. | Funciones anunciadas por el proveedor; no probadas con nuestras grabaciones. |
| [Descript Brand Studio](https://www.descript.com/brand-studio) | Página oficial | Biblioteca de marca compartida y coherencia de recursos; separar organización de activos de decisiones editoriales. | No inspeccionamos una cuenta ni su backend. |
| App Cutkind local | Código localizado con Graphify + ocho pasos por Playwright + REA DOM/accesibilidad | Ver qué preferencias existen y cuáles persisten; encontrar distancia entre configuración y criterio editorial. | Demo en Chromium, no sesión nube ni iPhone real. |

REA es útil para artefactos distribuidos o comportamiento observado. Para repos con fuente completa, se inspecciona código con herramientas normales; decompilarlo no añade evidencia. Una captura de scripts cargados no demuestra que cada módulo se ejecutó. No se intentó acceder a funciones privadas, evadir pagos ni subir videos a competidores.

Preguntas concretas para futuras inspecciones de producto: ¿una corrección cambia sólo el proyecto o una plantilla? ¿qué información se conserva al guardar estilo? ¿se explican diferencias entre referencia y resultado? ¿qué ocurre si un efecto tapa la cara? Cada respuesta deberá llevar un recorrido observable y no deducirse del marketing.

## Repositorios: adoptar, evaluar o estudiar

Licencias abajo son las declaradas en las fuentes consultadas; fijar versión/commit y revisar modelos y dependencias antes de incorporar código o distribuir artefactos. Esfuerzo indicado significa prototipo acotado, no producción.

| Prioridad | Recurso | Decisión y aplicación concreta | Evidencia / límites |
|---|---|---|---|
| P0 | [Remotion Agent Skills](https://github.com/remotion-dev/skills) | Reutilizar las skills instaladas de captions, markup, interactividad, multimedia y SaaS. Mantener composición y preview bajo el mismo contrato. | El motor tiene [licencia propia](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). No asumir MIT para skills: no se encontró LICENSE raíz/campo license en la inspección del catálogo. No actualizar versiones por inercia. |
| P0 | [Silero VAD](https://github.com/snakers4/silero-vad) | Auditar la cobertura ya disponible vía faster-whisper; ampliar reporte de voz sin texto. 1–2 días de spike si hace falta. | Repo MIT, release visible v6.2.3. Voz presente no implica palabras conocidas ni permiso para cortar una pausa. |
| P0 | [MediaPipe](https://github.com/google-ai-edge/mediapipe) | Candidato a validar rostro en cuadros finales si las cabezas/mattes actuales no alcanzan. Comparar con baseline local. 2–4 días. | Repo Apache-2.0; verificar modelo por separado. [Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker). Solapes y política de reparación serían lógica nuestra. |
| P1 | [WhisperX](https://github.com/m-bain/whisperX) / [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Mantener backend actual y preparar benchmark de nombres, cifras, habla mixta y alineación. 2–3 días de comparativa. | BSD-2-Clause / MIT declaradas. Releases visibles 3.8.6 y 1.2.1 respectivamente; no se propone upgrade. GPU CUDA no implica aceleración en Mac. |
| P1 | [PySceneDetect](https://github.com/Breakthrough/PySceneDetect) | Primer proveedor para segmentación de referencias y selección de muestras por escena. 1–2 días. | BSD-3-Clause, README anuncia v0.7.2 del 11 de octubre. Flash/zoom/transición pueden confundir el detector: no usar como métrica única de ritmo. |
| P2 | [OpenTimelineIO](https://github.com/AcademySoftwareFoundation/OpenTimelineIO) | Estudiar tiempos racionales y exportar cuts/audio básicos mediante adaptador, manteniendo nuestro PLAN. 2–4 días para exportación mínima. | Apache-2.0. No renderiza ni garantiza equivalencia de efectos. Adaptadores externos tienen versiones y límites propios. |
| P2 | [auto-editor](https://github.com/WyattBlue/auto-editor) | Baseline de márgenes/pausas y exportación; comparar decisiones sobre el mismo material. 1–2 días. | Unlicense del repo; binarios/assets pueden diferir. Implementación actual en Nim: no asumir API Python de tutoriales antiguos. |
| Referencia | [OpenCut](https://github.com/OpenCut-app/OpenCut) / [Classic](https://github.com/OpenCut-app/opencut-classic) | Inspeccionar undo, comandos y persistencia para inspirar el registro de correcciones. No sustituir nuestro motor. | MIT declarado. Principal en reescritura; Classic archivado. API/MCP/headless anunciados no se cuentan como capacidades ya disponibles. |

No hace falta incorporar todos. Primer stack: herramientas existentes + contrato de calidad + benchmark local; después una prueba pequeña de PySceneDetect y un detector de rostro/OCR sólo si resuelven un fallo medible.

Se inspeccionaron además cuatro archivos de OpenCut Classic y auto-editor en commits concretos: [hallazgos y permalinks](INSPECCION-CODIGO-ABIERTO.md). El patrón transferible es separar comandos reversibles, snapshots y registro editorial durable, conservando tiempos de origen y salida.

## Skills: conocimiento que usar y conocimiento que falta

| Skill disponible | Uso real / siguiente uso |
|---|---|
| `reverse-engineer-anything` | Aplicada: observación pasiva y ledger de evidencia. Usarla con objetivos concretos, no para exploraciones indiscriminadas. |
| `claudex-loop` | Aplicada: plan del host y revisión independiente solicitada a Opus 5.5, con límites y modelo observado registrados. |
| `remotion-best-practices` y guías captions/markup/SaaS | Router leído; aplicar guía específica al cambiar composición, captions o despliegue. No sustituye criterio editorial. |
| Skills Figma | Aplicadas a las tres pantallas conceptuales; estructura editable y comprobación visual. |
| `gsd-eval-planner` / `gsd-ai-integration-phase` | Disponibles como opción posterior para convertir el plan en evaluación formal; no ejecutadas en esta entrega ni necesarias para instalar más herramientas. |

Playwright es herramienta de prueba, no una habilidad de edición. Visión/OCR es un proveedor de evidencia, no aprobación estética. Evitar una mega-skill que mezcle autenticación, publicación y edición. Cuando tengamos reglas validadas, sí conviene una skill propia `cutkind-editorial-review` con checklist, referencias y formato de hallazgos. Su contenido debe salir del benchmark y de las correcciones, no de preferencias inventadas por el agente.

## Base de conocimiento propuesta

Empezar con archivos versionados, esquema claro y referencias a medios locales. Separar:

- **Reglas editoriales:** afirmación concreta, contexto de aplicación, prioridad, origen, confianza y estado de confirmación.
- **Referencias:** fuente, hash del archivo, intervalo y dimensión observada; lo que al creador le gusta y lo que rechaza.
- **Catálogo:** identificadores estables, parámetros, muestra fiel, restricciones de uso, proveedor y licencia.
- **Decisiones:** propuesta, resultado final, explicación, restricciones aplicadas y versiones.
- **Correcciones:** diferencia antes/después, causa técnica o gusto y alcance explícito.
- **Evaluación:** fixtures, anotaciones, métricas y resultados por versión, con reserva de ejemplos que no se usan para ajustar.

No guardar transcripciones privadas o medios en Git. La KB técnica de este directorio puede versionarse; los ejemplos del usuario se referencian por identificador/hash y quedan fuera. No hace falta RAG/vector DB para el volumen actual; decidirlo cuando exista una búsqueda concreta que archivos estructurados no resuelvan.

## Lo que puedo avanzar antes de las grabaciones

1. **Contrato de personalidad editorial:** migración compatible, precedencia de reglas, procedencia, snapshot y resolución determinista. El esquema de datos se puede definir ahora.
2. **Decisiones y correcciones:** registrar qué cambió y si aplica a este video o al perfil. Esto prepara aprendizaje sin inventarlo.
3. **Harness de evaluación:** fixtures sintéticos, manifiestos, captura Playwright, extracción de cuadros del MP4, QC separado por dimensión y ejemplos negativos.
4. **Orquestación local con proveedores simulados:** estados, límites, reinicios, idempotencia y fallos; luego sustituir por API real y medirla.
5. **Contrato de análisis de referencia:** tiempos, paleta, texto, movimiento y confianza. La extracción puede prototiparse; la interpretación del gusto se calibra con tus ejemplos.
6. **Interfaz de personalización:** propuesta Figma con origen de reglas, comparación del mismo clip y corrección reversible. Implementación posterior basada en las pruebas.

Queda condicionado a nuevas grabaciones: calidad editorial, aceptación por creador, precisión de transferencia de referencias y calibración de reparación visual. Queda condicionado a acceso/operación: validación real de propuesta IA, recorrido nube y presupuestos de ejecución. La credencial no es requisito para diseñar contratos ni probar fallos con fixtures.

## Diseño conceptual

[Abrir las tres pantallas en Figma](https://www.figma.com/design/nYnrQP08VM01puO6HI8lSx?node-id=3-129).

- Mi estilo: cada preferencia muestra si fue definida, inferida o aprendida y confirmada.
- Comparación A/B: mismo clip y tiempo, una dimensión distinta; elección contextual.
- Corregir y recordar: opción inicial «sólo este video»; regla futura concreta, editable y reversible.

Son wireframes conceptuales con capas editables; no prototipo funcional ni pantallas ya integradas. Se validaron capturas y se corrigieron superposiciones en la construcción. No necesitábamos nuevos iconos de marca para resolver esta decisión de producto.

## Límites y decisiones pendientes

- Mobbin MCP devolvió «requires a paid plan». No se obtuvieron pantallas ni se atribuye investigación a esa biblioteca. Las referencias externas efectivas son páginas oficiales públicas.
- No se ejecutaron modelos descargados, repos externos ni llamadas de edición pagadas. La llamada de revisión a Claude está cubierta por la autorización expresa del usuario y se registra aparte.
- La mayor parte de cambios locales del producto precede a esta investigación. Este reporte no los declara revisados íntegramente ni listos para publicación.
- La validación visual realizada es una muestra; no prueba audio, sincronización continua, todas las resoluciones ni gusto del usuario.
- No se encontró evidencia suficiente para afirmar que un modelo es superior en edición de video. Opus 5.5 se solicita por preferencia del usuario; su contribución se evalúa por hallazgos y, después, por resultados comparables.

## Fuentes complementarias

- [Playwright: comparaciones visuales](https://playwright.dev/docs/test-snapshots).
- [Apple Vision: OCR, rostro y análisis visual](https://developer.apple.com/documentation/vision).
- [Claude: criterios de éxito y evaluaciones](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests).
- [Remotion: uso de GPU](https://www.remotion.dev/docs/gpu): medir cada etapa antes de comprar cómputo.


## Cierre de revisión independiente

Claudex completó tres rondas con modelo observado `claude-opus-5-5`. Veredicto final: **APPROVED** para el plan de trabajo futuro. Se incorporaron al plan 14 hallazgos iniciales y 4 de segunda ronda. Dos aclaraciones menores finales quedaron aceptadas en SIGUIENTE-TRABAJO.md. El runner confirmó que la aprobación coincide con el SHA256 actual del plan; respuesta completa, límites y desviaciones en CLAUDEX-LOG.md. No equivale a aprobación de implementación ni de calidad audiovisual.
