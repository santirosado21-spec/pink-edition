# Plan de implementación pendiente: Cutkind

Fecha: 20 de octubre de 2026. Estado: **implementación iniciada; primer incremento de A0/A1/A6 implementado y verificado localmente**. El hito A completo sigue pendiente. Ver AVANCE.md.
Autor: Codex. Revisión independiente Claudex: no ejecutada por incompatibilidad del CLI; ver LOG.md.

**Cambio posterior del usuario:** aplicar primero [ONE-SHOT.md](ONE-SHOT.md). Preguntas por grabación antes de subir, primera edición con música + 2 tarjetas + 2 gráficos + 2 B-rolls + transiciones, temporales hasta exportación explícita. Biblioteca manual y chat posterior no son el flujo de esta prueba. Subida habilitada al confirmar las preguntas, con sesión temporal. La recepción se valida por separado del motor editorial aún incompleto.

## Resultado buscado

A partir de una grabación nueva y un perfil explícito, producir una versión candidata con decisiones editoriales pertinentes, recursos licenciados, voz íntegra y composición legible. El usuario debe poder compararla con el original, corregirla y aprobarla. Después demostrar repetibilidad y trasladar la ejecución a infraestructura que no dependa de la Mac.

El primer hito es una prueba local útil con el nuevo video del usuario. No se requiere comprar una API. Este documento describe el alcance total: los paths enumerados siguen siendo propuestos salvo los identificados como implementados en AVANCE.md. No se habilita publicación automática.

## Base comprobada y supuestos

| Evidencia actual | Implicación para el trabajo |
|---|---|
| `app/_lib/ollamaEditor.ts`: Qwen local con salida estructurada, límite de entrada, exclusión de inferencia y liberación del modelo | Reutilizar transporte; medir criterio y recursos. No sustituirlo sólo por tamaño del modelo. |
| `app/_lib/contextualProposal.ts`: siete acciones fotografiables, citas exactas, filtros y revisión visual | Ampliar a decisiones editoriales estructuradas; hoy no selecciona las recetas de la biblioteca. |
| `app/_lib/commonsPhotos.ts`, `stockPhotos.ts`, `stockProvider.ts`: Wikimedia CC0 sin clave; búsqueda y descarga reales verificadas | Reutilizar como un proveedor. No garantizar que encuentre imágenes para cualquier concepto. |
| Última propuesta real: cero imágenes aceptadas; logotipos rechazados y siete decisiones conservadas | Transporte y rechazo funcionan; calidad editorial todavía no aprobada. |
| `src/visualSafety.ts`, `app/_lib/faceSafety.ts`: cara/captions protegidos con medición local | Reutilizar y extender a nuevas composiciones; no asumir cobertura de todos los frames ni portabilidad Linux. |
| `style/reference-library-v1.json`: ocho referencias, 27 recetas, 17 reglas candidatas | Cinco recetas son muestras; 22 especificaciones; cero conectadas al selector automático. |
| `app/_lib/jobs.ts`: preparación y render separados, check-then-spawn, guardado del plan activo | No sirve todavía como orquestador durable ni como almacén inmutable de candidatos. |
| `scripts/worker.py`: analyze prepara; render carga plan/timeline; adapta tamaño con `fit`/`shrink` | Reutilizar motor, corregir persistencia y política de calidad antes de producción. |
| `app/_lib/profile.ts`: perfil por cuenta y archivo local único | Implementar marcas y snapshots; no afirmar aislamiento por marca ni aprendizaje. |
| Umbral aprobado como muestra adicional | No cambiar estilo predeterminado, ni aplicar tipografía nueva globalmente. Otras familias no aprobadas. |

Decisiones conservadas: hasta diez videos por semana; piloto de persona a cámara, español, vertical, 30–90 s; originales intactos; conservar voz y orden y cortar únicamente silencios. Un original largo se registra aparte, no se mutila para encajarlo. Procesamiento de contenido privado local por defecto. APIs de modelos externas, compras, despliegues y colaboración de agencia no son requisitos del primer hito.

La web, cuentas y renderer existentes se reutilizan. No entra un rediseño de landing, una nueva facturación ni instalar más bancos/skills sin una necesidad demostrada.

## Arquitectura objetivo

Original inmutable → preparación → snapshot de perfil/estilo → análisis de mensaje y escenas → decisiones → resolución de recursos → compilación temporal/espacial → candidato → proxy → QC → revisión humana → exportación aprobada.

Dos contratos separados:

- **EditorialIntent v1**: propósito, cita exacta y rango de fuente, receta elegida, texto respaldado por el discurso, necesidad de recurso y decisión de dejar limpia la toma. El modelo no escribe coordenadas, código ni paths de archivos.
- **EditPlan v2**: eventos compilados con frames y recursos registrados, perfil/estilo/versiones congelados, procedencia y vínculos al original. El código valida y renderiza.

Un `keep_speaker` explícito es una decisión válida; no se cuentan efectos para aparentar edición. Si un brief exige explicar algo visualmente y no hay cobertura, debe aparecer una carencia concreta, no un falso éxito.

## Entrega A — Lo necesario para la nueva prueba local

### A0. Congelar una base y hacer la prueba reproducible

**Modificar:** integración de `jobs.ts`, `scripts/pink_edit.py`, documentación de pruebas. **Crear:** `app/_lib/runManifest.ts`, `scripts/evaluate_pilot.mjs`, `schema/run-manifest.schema.json`.

- ID independiente del nombre, hash del original, sesión de grabación, perfil, estilo, catálogo, prompt, código, digest del modelo y parámetros por ejecución.
- Comprobar el conformado existente con rotación de móvil, VFR, audio desfasado y distintas tasas de frames; usar timebase/fps del manifiesto al compilar. Si HDR o formato no está soportado, avisar sin alterar color silenciosamente. No reconstruir el conformador si ya pasa.
- Registrar duración de etapas, memoria/presión/swap observables, errores, intervenciones y recursos. Diferenciar generación de plan, QC técnico y aprobación editorial.
- Conservar baseline, primera propuesta y revisiones por separado. La referencia de investigación no se convierte automáticamente en footage disponible para reutilizar.
- Crear fixtures de desarrollo con material propio/sintético. Congelar el paquete antes de usar el nuevo video para puntuarlo; si luego se ajusta con sus fallos, pasa a desarrollo y hace falta otro video nuevo para evaluar.

**Aceptación:** repetir un render desde manifiesto sin volver a proponer; original y versión activa no cambian; ausencia de una dependencia es explícita.

### A1. Contratos, compilador y versiones candidatas

**Modificar:** `src/edit.ts`, `schema/edit-plan.schema.json`, `scripts/plan_io.py`, `app/_lib/jobs.ts`, `proposalPlan.ts`, `propose.ts`. **Crear:** `schema/editorial-intent.schema.json`, `app/_lib/editorialIntent.ts`, `app/_lib/compileEditorialPlan.ts`, `app/_lib/candidates.ts`.

- Validación compartida TS/Python mediante fixtures; adaptador v1→v2 probado, con rollback. Rechazar tipos desconocidos; nunca borrar campos o decisiones manuales silenciosamente.
- Candidato inmutable: `candidate_id`, `base_version`, hashes, eventos con origen asignado por servidor y estado. Recursos sólo por ID del registro, no URLs/paths inventados por el modelo.
- Tiempos desde citas únicas y anclas: duración mínima legible, solapes, densidad, final dentro del clip y ausencia de cifras/CTA no dichos. Párrafos ambiguos vuelven a revisión.
- Escribir candidatos y outputs en rutas separadas por ejecución. Adaptar el motor para recibir directorios explícitos: el actual `--plan` no basta para aislar el job.
- Todas las escrituras del activo y su promoción usan compare-and-swap de versión, lock de escritura atómico y reemplazo atómico. El check de versión y el cambio deben ocurrir en la misma sección crítica. Un guardado manual invalida candidatos de esa base; conflicto devuelve 409.
- Registro de evento: cita/propósito, receta, asset, fuente/modelo o usuario, estado de verificación y motivo de rechazo. `origin=manual` nunca se acepta sólo porque lo declare el cliente.

**Aceptación:** una propuesta tardía o un render concurrente no pisa una corrección; candidato inválido no se promueve; vista previa y exportación consumen el mismo plan congelado.

### A2. Director que elija cómo explicar el mensaje

**Modificar:** `contextualProposal.ts`, `ollamaEditor.ts`, `propose.ts`. **Crear:** `app/_lib/editorialAnalysis.ts`, `app/_lib/recipeSelection.ts`, `prompts/editorial-director-v1.md`.

- Sustituir la única vía de siete consultas por análisis del discurso completo: tema, intención, entidades, acciones, afirmaciones y momentos que necesitan explicación.
- Seleccionar sólo recetas registradas y habilitadas para el perfil, con parámetros limitados. Opciones iniciales: título, énfasis, pasos, imagen, demostración, B-roll y conservar toma.
- Separar análisis de selección y compilación. JSON válido no prueba criterio. Frase y propósito deben corresponder al mensaje; logo de software no sustituye una pantalla de edición.
- Distinguir «hablar de una actividad» de «demostrar nuestro producto»; lo segundo sólo usa material propio vinculado. No crear capturas falsas ni representar un stock como prueba de una función.
- Entregar un plan global de densidad y ritmo; evitar recursos redundantes en frases próximas. Aplicar preferencias antes de buscar medios.
- Presupuesto de contexto calculado; si excede el piloto, avisar. No cortar el transcript silenciosamente. Para videos largos, diseñar segmentación con contexto global como ampliación posterior.
- Registrar versión del modelo y digest. Prueba de inferencia sin red externa, nube Ollama desactivada y sin fallback externo; la búsqueda de assets puede ocurrir en otra etapa con Internet.

**Aceptación:** en fixtures no vistos durante el ajuste, cada recurso tiene una justificación observable; negaciones, números, excepciones de marca y `graphics=none` se respetan. Medir primera propuesta sin correcciones nuestras ocultas.

### A3. Registro de recursos propios, fotos y B-roll sin claves

**Modificar:** `stockPhotos.ts`, `commonsPhotos.ts`, `StockPhotos.tsx`, rutas locales de medios. **Crear:** `app/_lib/assetLibrary.ts`, `app/_lib/assetSearch.ts`, `app/_lib/assetValidation.ts`, `schema/asset-manifest.schema.json`, `app/api/assets/route.ts`, `app/_components/AssetLibrary.tsx`.

- Biblioteca por marca/video con original, tipo, duración, dimensiones, licencia/permiso, hash, tags y procedencia. Subida/importación explícita y validada de imágenes, capturas y clips propios; no indexar todas las carpetas del usuario.
- Buscar primero originales vinculados, después biblioteca aprobada y finalmente Wikimedia sin clave. Mantener las fuentes opcionales actuales sin hacerlas requisito.
- Consultas basadas en intención, sin nombres privados ni transcript completo. Filtrar logos/iconos cuando se requiere una escena; ranking por evidencia semántica, encuadre, resolución y actualidad pertinente, no sólo orden del buscador.
- Inspección visual local de candidatos. Límites de búsquedas/descargas, deduplicación por hash, caché con fecha/licencia y política de fallo. Revalidar fuente/licencia cuando corresponda; conservar historial de procedencia, no borrar originales usados en renders.
- B-roll inicial con clips propios o ya licenciados y vinculados: seleccionar intervalo, adaptar encuadre, mantener voz A-roll, audio del recurso desactivado por defecto. No cortar frases para encajar footage.
- Ausencia de recurso: proponer una receta gráfica compatible o conservar toma con aviso específico. Ninguna sustitución estética automática sin justificación.
- Definir desde el inicio manifest portable y rutas lógicas. El primer almacenamiento es local; backend cloud se incorpora en C1.

**Aceptación:** demo de inserción de imagen y de clip realmente renderizados, sonido de voz conservado, licencia trazable y aislamiento entre bibliotecas. Sin cuentas de bancos ni APIs pagadas.

### A4. Primer catálogo operativo, no sólo muestras

**Modificar:** `src/EditorialGraphics.tsx`, `src/PinkEdit.tsx`, `src/Root.tsx`, `style/catalog-v1.json`, biblioteca de referencias, preferencias. **Crear:** `src/recipes/registry.ts`, `src/recipes/*`, `src/BrollLayer.tsx`.

Primer paquete de seis recetas: `estampa-editorial-title`, `pulso-opening-hierarchy`, `umbral-detail-callout`, `enlace-progress-route`, `enlace-concept-demo`, `enlace-device-demo`. La foto actual se reutiliza. Cada receta tiene parámetros, límites, dependencia de assets, estilos compatibles, fallback y pruebas visuales en vertical.

- El registro anuncia al director únicamente recetas implementadas, validadas y habilitadas. Importar muestras Umbral exige eliminar texto/metraje fijo y usar datos del plan.
- Tipografía Inter Display Bold uniforme en el estilo base. Tipografía distinta sólo en un estilo explícitamente escogido, con fuentes locales licenciadas; Umbral no se vuelve predeterminado.
- Títulos y énfasis se derivan de palabras dichas; guías y pasos no inventan procesos. Device-demo muestra capturas reales que aportó el usuario.
- Anclar animación al frame; compatibilidad 30 fps y límites del formato. No usar animación CSS de reloj ni ejecutar código generado por el modelo.
- Marcar `automatic_editor_support=true` sólo tras pasar compilador, renderer y QA, receta por receta.

**Aceptación:** cada receta puede activarse desde una intención válida y aparecer en proxy/exportación. Distinguir prueba de componente de aceptación del director que lo elige.

### A5. Composición y sonido verificables

**Modificar:** `visualSafety.ts`, `faceSafety.ts`, `EditorialGraphics.tsx`, `BackgroundEffects.tsx`, `PinkEdit.tsx`. **Crear:** `app/_lib/layoutPlan.ts`, `src/AudioMix.tsx`, `schema/audio-plan.schema.json`, `scripts/check_audio_mix.py`.

- Layout por evento completo, incluyendo entrada/salida, zooms, cara, captions y márgenes. Recalcular o bloquear si cambia encuadre; no dar por seguro un único fotograma.
- No ocupar el rostro cuando no haya medición fiable. Reubicar, reducir dentro de límites legibles o conservar toma; nunca ocultar recursos sin registrarlo.
- A-roll con B-roll como corte de apoyo y voz continua; overlays y fondos seguros. Las demostraciones a pantalla completa deben ser una decisión explícita de composición, no un fallo de oclusión.
- SFX y música propios/licenciados, intervalos y ganancias explícitos, ducking durante voz, límites de pico y loudness por perfil. Perfil sin sonido añadido debe respetarse.
- Fallback sin música si no hay pista idónea. Evitar una transición/sonido en cada palabra; registrar cambios y motivos.

**Aceptación:** fixtures de cara móvil, zoom, captions largos y entradas; voz entendible y sin pérdidas al insertar B-roll; revisión visual y escucha de todas las transiciones del clip de prueba.

### A6. Proxy, informe y comparación para el usuario

**Modificar:** `Editor.tsx`, `stages.ts`, rutas de propuesta/plan/render. **Crear:** `app/_components/CandidateReview.tsx`, `app/api/jobs/[id]/candidates/route.ts`, `app/api/jobs/[id]/candidates/[candidateId]/promote/route.ts`, `scripts/qc_candidate.py`.

- Permitir corregir transcripción/nombres propios conservando IDs cuando sólo cambie texto; cambios de segmentación generan timeline nuevo e invalidan las anclas/candidatos afectados. Revisión de ASR con baja confianza antes de inventar títulos a partir de texto dudoso.
- Vista original/base/candidata sincronizada, lista de decisiones por frase, antes/después y motivos de omisiones. Guardar cambios sobre una revisión nueva; deshacer y volver a una versión anterior.
- Proxy con el mismo plan/recursos/layout que el master. Señalar que es preview; no retranscribir ni reproponer al exportar.
- QC técnico: decodificación, dimensiones, duración, audio, referencias faltantes, orden y mapa de intervalos de voz. Comparación de audio con fuente y escucha de cortes sospechosos.
- QC visual: antes/durante/después de cada evento y mayor densidad durante animaciones; comprobar geometría por frame en esos intervalos. VLM local critica pertinencia, sin sustituir aceptación humana.
- Estados separados: preparado, candidato, QC fallido, necesita revisión, renderizado y aprobado. Ninguna suma de efectos permite marcar «publicable» automáticamente.

**Aceptación del primer hito A:** importar nuevo video → generar candidato → revisar proxy → corregir si hace falta → exportar la versión revisada en entorno local. Primera propuesta y cambios posteriores claramente separados. El usuario determina si la mejora es publicable; todos los controles duros deben pasar.

## Entrega B — Repetición y aprendizaje

### B1. Orquestación durable y protección del Mac

**Modificar:** `jobs.ts`, upload, `pink_edit.py`, `worker.py`, `stages.ts`. **Crear:** `app/_lib/pipelineState.ts`, `app/_lib/resourceLease.ts`, `scripts/editor_worker.mjs`, `schema/pipeline-state.schema.json`.

- Cola local persistente con claim atómico, propietario/lease, heartbeat, fencing, checkpoints y artefactos confirmados. Un solo propietario orquesta cada job; Python es motor de preparación/render y Node dirige las llamadas editoriales.
- Exclusión compartida de tareas pesadas entre preparación, inferencia y render. `runningJob()` y el lock de Ollama por separado no aseguran esta exclusión global.
- Recursos siempre en orden fijo: lease del job, luego slot pesado por etapa; guardado/promoción mantiene sólo un lock corto de versión. Ninguna llamada a modelo/render bajo lock de edición. Probar ausencia de deadlocks y fencing tras expiración.
- Tras una carga confirmada iniciar preparación→dirección→assets→compilación→proxy→QC; cerrar pestaña no cancela el proceso. No implementar esta cadena con useEffect.
- Pausa entre etapas, cancelación y limpieza sin perder originales. Reinicio reanuda desde artefactos validados por hash, no de datos a medio escribir.
- Máximo dos reparaciones automáticas por candidato, contador durable; sólo eventos automáticos y contra la misma base. Fallo incierto/no confianza → revisión humana. Reintentos no reinician contadores.
- Medir presión de memoria/swap y respuesta del Mac con trabajo normal; `keep_alive:0`, límite de contexto, detener admisión si hay presión sostenida. No prometer comodidad sin esa medición.

**Aceptación:** matar worker a mitad de cada etapa, duplicar petición y editar durante render; recuperar sin pérdida ni doble promoción. Probar upload→candidato sin botón Proponer. El master final sigue ligado a la versión aprobada.

### B2. Marcas, feedback y memoria revisable

**Modificar:** `profile.ts`, `profileFile.ts`, `preferences.ts`, cuestionario/editor. **Crear:** `app/_lib/brands.ts`, `app/_lib/feedback.ts`, `app/_lib/styleMemory.ts`, `schema/brand-profile.schema.json`, `app/api/brands/route.ts`, `app/api/jobs/[id]/feedback/route.ts`.

- Entidad marca y `brand_id` obligatorio en jobs del piloto; migrar perfil global a marca predeterminada sin mezclarlo con otras marcas. Snapshots por ejecución.
- Guardar aceptar/rechazar/cambiar, evento anterior/posterior, timestamp, motivo y versión. No deducir rechazo porque el usuario no abrió la app.
- Recuperar ejemplos aprobados y proponer reglas; no fine-tuning inicialmente. Una regla requiere confirmación y evidencia consistente; puede consultarse, desactivarse o revertirse.
- Precedencia: integridad → instrucción explícita del video → perfil de marca → aprendizaje compatible. Una excepción por video nunca reescribe el perfil silenciosamente.
- Regla aprendida es datos con esquema, no prompt arbitrario. Comparar antes/después sobre videos nuevos; registrar autor y fuente.

**Aceptación:** dos marcas de una cuenta conservan estilos separados; excepción aislada no contamina cuenta; revertir regla reproduce el estado anterior.

### B3. Completar las 27 recetas por dependencias

Todas siguen pendientes de selección automática al escribir este plan. A4 atiende seis; este inventario asegura no perder las demás.

| ID de receta | Implementación pendiente / orden |
|---|---|
| umbral-dual-title | Generalizar OpeningScene a palabras reales; después de A4, estilo Umbral |
| umbral-linked-ideas | Generalizar DiagramScene, enlaces sólo sustentados en discurso; después de A4 |
| umbral-detail-callout | A4; objetivo visual real y geometría de A5 |
| umbral-mosaic | Generalizar MosaicScene; requiere varios recursos pertinentes A3 |
| umbral-light-close | Generalizar ClosingScene; no inventar CTA |
| bitacora-time-marker | Hora aportada por metadata/usuario; no inferirla por aspecto del video |
| bitacora-quiet-captions | Perfil sobrio y captions discretos; pruebas de legibilidad |
| bitacora-day-sequence | Varios momentos ordenados; necesita cobertura e instrucciones de montaje |
| estampa-editorial-title | A4 |
| estampa-activity-label | Etiqueta literal ligada a acción/escena; después de A2/A4 |
| estampa-detail-chain | Recursos encadenados con voz intacta; depende de B-roll A3/A5 |
| pulso-word-build | Revelado de palabras alineadas; sin transcripción inventada |
| pulso-color-stress | Acentos según perfil y palabras; reutilizar énfasis existente donde encaje |
| pulso-spatial-phrase | Composición distribuida fuera de cara/captions; A5 |
| pulso-action-cuts | Cobertura de acciones; fase específica de montaje, no recorte de voz implícito |
| pulso-opening-hierarchy | A4 |
| pulso-two-entry-levels | Dos variantes de animación por receta, frame-based |
| pulso-text-path | Texto alrededor de región rastreada; A5 y evaluación de legibilidad |
| enlace-match-action | Correspondencia de gesto entre tomas reales; modo de montaje explícito |
| enlace-gesture-guide | Medición de movimiento y guía visual; revisión de fiabilidad |
| enlace-device-demo | A4; captura real del producto |
| enlace-chapter-card | Capítulos derivados del discurso; A2/A4 |
| enlace-concept-demo | A4; ejemplo real o gráfico sustentado |
| enlace-framing-overlay | Guía de captura/encuadre opcional; no efecto universal en entregas |
| enlace-progress-route | A4; orden/cantidad de pasos sustentados |
| enlace-literal-object | Recorte de objeto real con licencia y máscara revisada |
| enlace-resource-stack | Lista visual respaldada por recursos mencionados; A3/A4 |

Cada receta incluye contrato, compilación, renderer, variantes permitidas, ficha de uso/evitación, assets/licencias, muestra visual y test negativo. Las 17 reglas de tutoriales pasan a un registro de reglas candidatas con aplicabilidad y pruebas; no se activan todas como reglas globales. Bitácora/Estampa/Pulso/Enlace conservan nombres de trabajo hasta revisión visual. No reutilizar nombres comerciales del competidor.

### B3b. Acabado visual y análisis de cobertura

**Modificar/extender:** preparación en `scripts/pink_edit.py`, contratos de estilo y `src/PinkEdit.tsx`. **Crear:** `scripts/analyze_coverage.py`, `schema/color-plan.schema.json`, `src/ColorTreatment.tsx` si no hay un componente equivalente reutilizable.

- Analizar escenas/cambios de toma, regiones de interés y estabilidad de matte/rostro. Múltiples personas o detección incierta pasan a composición conservadora/revisión; no asumir siempre un único sujeto centrado.
- Balance y consistencia entre tomas antes del look creativo; transformaciones explícitas, versionadas y reversibles, con tratamiento de espacio de color verificado. No aplicar un filtro global a todos los clientes.
- Continuidad, match-action y reencuadre sólo con cobertura real y modo permitido; no generar ángulos ficticios ni modificar narrativa dentro del modo que conserva voz/orden.
- Pruebas de tonos de piel, bordes de recorte, cambios de exposición y paridad preview/master. Si no hay evidencia fiable, conservar el original y mostrar el límite.

**Aceptación:** correcciones trazables y reversibles, sin halos/recortes críticos, y aprobación humana por estilo; no son prerrequisito para la primera prueba A si el original no presenta estos problemas.

### B4. Banco de evaluación Fran

**Crear:** `scripts/import_pilot.py`, `scripts/evaluate_pilot.mjs` (extender A0), `scripts/report_pilot.py`, fixtures de contratos y `docs/pilot-rubric.md`.

- Inventario privado por cliente, sesión y dificultad; originales inmutables, duplicados por hash y cobertura sobre todo lo recibido.
- Primeros cinco clips representativos; dos corridas locales por clip. Llegar a diez de desarrollo y veinte NUEVOS de evaluación, separados por sesión completa. Mantener versiones congeladas.
- Medir primera propuesta, modificaciones, minutos humanos, errores, recursos, tiempos y coste por aceptado. Comparar baseline y referencia aprobada cuando exista.
- Rúbrica 1–5: pertinencia, ritmo, legibilidad, marca y disposición a publicar. Objetivo propuesto del plan anterior: 16/20 publicables con ajustes ≤5 min, cero fallos duros y al menos cinco casos que requieran gráficos con ≥80% de aceptación. Es asistencia reducida, no 100% autonomía.
- El nuevo video del usuario es una prueba individual; no prueba generalización ni reemplaza la cohorte.

## Entrega C — Producción sin la Mac

### C1. Persistencia y contratos remotos

**Modificar:** `app/_lib/cloud.ts`, `scripts/worker.py`, rutas upload/plan/render y almacenamiento existente. **Crear:** migraciones versionadas para brands, assets, candidate_runs, feedback, reglas, jobs/leases y políticas de acceso; adaptador de almacenamiento y exportador de manifiestos.

- Mapear estados internos a esquema remoto explícitamente; backfill y rollback ensayados antes de migrar datos reales.
- Subidas directas/reanudables y confirmación de checksum antes de encolar; URLs firmadas de corta duración. Originales y candidatos inmutables, referencias por tenant/marca/job.
- Cola con claim transaccional, lease/heartbeat/fencing, reintentos limitados y cola de fallos. CAS para promoción; idempotencia por versión/etapa/intento.
- Persistir TODOS los assets/fonts/SFX/timelines/mattes/manifiestos; ninguna dependencia de Desktop/localhost/disco efímero. Render aislado por job/intento.
- Eliminar la degradación silenciosa del master por `fit`/`shrink`: proxy explícito y master conservado, o error de capacidad. Dimensionar límites con archivos reales.
- Acceso por cuenta y marca; roles uploader/reviewer para agencia sólo si se habilita colaboración. Pruebas de cuentas diferentes y marcas del mismo dueño. Retención, borrado y limpieza de temporales con dependencias de renders.

### C2. Worker Linux y arranque remoto

**Crear:** `Dockerfile.worker`, lock/versiones de runtime, manifiesto de pesos, `scripts/preflight_worker.py`, adaptador de rostro compatible Linux y pruebas de paridad.

- Empaquetar FFmpeg, Chromium/Remotion, fuentes, pesos y librerías. No asumir que Dockerfile.web empaqueta el motor ni que Apple Vision funciona en Linux.
- Sustituir detector macOS por implementación local equivalente y evaluar contra el mismo conjunto de frames antes de habilitar overlays remotos.
- Un worker al inicio, capacidad desde cero, disco suficiente y disparador cloud que arranque trabajos. Una cola sin consumidor independiente no cumple el objetivo.
- Medir CPU/GPU/arranque/almacenamiento; separar inferencia y render sólo si conviene. Presupuesto de admisión, límite de concurrencia y reconciliación de gastos; nunca reintentos ilimitados.
- Modelo local en servidor significa independiente del Mac, no infraestructura gratuita. Proveedor y presupuesto se eligen con mediciones; despliegue de grabaciones privadas sólo con alcance autorizado.

### C3. Operación, recuperación y expansión

**Crear:** telemetría por etapa sin contenido privado, panel de errores/costes, procedimientos de recuperación, pruebas de caos, versionado/canario/rollback.

- Cinco fixtures públicos/sintéticos; diez clips autorizados con paridad del mismo plan local/Linux. Comparar voz/timings/composición/QC, no exigir hash idéntico entre encoders.
- Cargar diez trabajos, apagar la Mac y comprobar desde otro dispositivo que terminan y se descargan. Probar arranque desde cero y tras inactividad.
- Fallos inyectados: worker caído, mensaje duplicado, timeout, almacenamiento, cancelación, edición concurrente y propietario antiguo que reaparece. Un resultado activo correcto y ningún original/cambio perdido.
- Piloto privado con revisión humana. Cohorte operativa inicial de 50 trabajos soportados; objetivo 49/50 completados dentro de reintentos, cero pérdidas/accesos cruzados. Informar primer intento y fallidos; separar éxito técnico de aceptación estética.
- Publicación automática a redes fuera del alcance. No aumentar concurrencia o marcas hasta demostrar calidad y aislamiento.

## Dependencias y orden de ejecución

A0 → A1 → A2/A3 → A4 → A5 → A6 → primera prueba del usuario.

B1 se apoya en A1 y A6; B2 requiere snapshots de A0/A1; B3 amplía A4; B4 empieza a registrar desde A0 y evalúa cuando el paquete esté congelado. La portabilidad C2 puede investigarse temprano; producción C1–C3 requiere contratos y calidad ya comprobados.

Si hay capacidad, A2 y A3 son separables; no editar simultáneamente contratos compartidos sin congelarlos. Este plan no lanza agentes ni trabajos de implementación automáticamente.

## Verificación ejecutable

**Comandos existentes** que se conservarán y correrán según los módulos afectados (no fueron ejecutados por escribir este plan):

```sh
npm run typecheck
node scripts/test_contextual_proposal.mjs
node scripts/test_commons_photos.mjs
node scripts/test_stock_photos.mjs
node scripts/test_pixabay_photos.mjs
node scripts/test_ollama_editor.mjs
node scripts/test_editor_ai.mjs
node scripts/test_personalization_contract.mjs
node scripts/test_brand_catalog.mjs
.venv/bin/python scripts/test_personalization_contract.py
.venv/bin/python scripts/test_brand_catalog.py
CUTKIND_PLAYWRIGHT_RUNTIME=/Users/santiagorosado/.cache/codex-runtimes/codex-primary-runtime/dependencies/node node scripts/test_personalization_browser.mjs
```

**Comandos por construir**, requisito de cada entrega; no afirmar que existen/pasan hoy:

| Entrega | Comando propuesto | Evidencia requerida |
|---|---|---|
| A0/A1 | `node scripts/test_candidate_versions.mjs` | Migración, CAS concurrente, candidato aislado y rollback |
| A2 | `node scripts/test_editorial_intent.mjs` | Citas, negaciones, cifras, recetas habilitadas y abstención |
| A3 | `node scripts/test_asset_library.mjs` | Permisos, hashes, formatos, procedencia y búsqueda sin clave |
| A4/A5 | `node scripts/test_recipe_contracts.mjs` | Todas las recetas activas compilan; errores/variantes inválidas rechazadas |
| A4/A5 | `node scripts/render_recipe_checks.mjs` | Stills y contacto de entrada/medio/salida, casos verticales extremos |
| A5/A6 | `.venv/bin/python scripts/test_candidate_qc.py` | Audio/voz, frames críticos, referencias faltantes y fallos visibles |
| A6 | `node scripts/test_candidate_review_browser.mjs` | Next real: propuesta→revisión→guardar→render→descarga; doubles sólo para fallos controlados claramente identificados |
| B1 | `node scripts/test_pipeline_recovery.mjs` | Reinicio, lease vencido, cancelación, doble entrega y edición concurrente |
| B2 | `node scripts/test_style_memory.mjs` | Separación marcas, promoción/reversión y excepción por video |
| B4 | `node scripts/evaluate_pilot.mjs --manifest work/fran-pilot/manifests/eval.json` | Primera propuesta y revisiones separadas; cohortes sin fuga |
| C1–C3 | `node scripts/test_remote_pilot.mjs --manifest work/fran-pilot/manifests/remote.json` | Acceso, paridad, recovery y prueba documentada con Mac apagada |

Las rutas de manifiesto de ejemplo sólo se usarán cuando existan y estén autorizadas. Las pruebas visuales y escucha humana forman parte de aceptación; no se sustituyen con TypeScript ni por un VLM que revise su propia salida. Ejecutar `graphify update .` tras cada incremento de código. No duplicar pruebas reversibles de presentación sin un riesgo real.

## Cómo grabar el próximo video de prueba

Grabar un tema real, preferiblemente vertical y de 45–90 s, con voz clara y archivo original. No hace falta leer un guion artificial ni mencionar números para provocar efectos. Si el tema naturalmente tiene pasos, contraste o ejemplos, dejarlos en el discurso; también debe haber frases donde convenga mantener la toma limpia.

Acompañar, cuando estén disponibles: una frase sobre público/objetivo, estilo deseado (base o Umbral), cosas a evitar y capturas/footage propio si se explica el funcionamiento de un producto. Su ausencia debe producir una petición de recurso específica o una alternativa honesta, no una demo inventada. No se exige entregar todo para empezar a preparar el original.

La primera prueba nueva evalúa A0–A6; no esperar a las 27 recetas ni a la nube. Debe mostrar qué eligió el director, por qué, qué no pudo resolver, cuánto tardó y cuánto hubo que corregir. No se promete una fecha ni un porcentaje de autonomía sin pasar esa prueba.
