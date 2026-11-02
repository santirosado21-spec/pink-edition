# Plan de autonomía personalizada — propuesta para revisión

Fecha de trabajo: 15 de octubre de 2026, America/Mexico_City.
Documento de propuesta, no implementada. Estado y alcance de revisión independiente en CLAUDEX-LOG.md; la aprobación, si existe, corresponde al SHA256 registrado allí.

## Objetivo y alcance de esta entrega

Investigar repositorios, skills y sistemas observables, contrastar la propuesta con Claude Opus 5.5 mediante Claudex, auditar la personalización actual y definir trabajo ejecutable antes de recibir nuevas grabaciones. Entregar investigación con fuentes, evidencia de Playwright/REA, validación visual limitada, diseño conceptual y prioridades. Esta entrega no activa cobros, nube, publicaciones ni modifica la edición de videos del cliente. La siguiente implementación se decidirá sobre este plan concreto.

Objetivo de producto: footage real + preferencias del creador → edición contextual reproducible → comprobación → entrega o explicación concreta de revisión necesaria. La personalización comprende decisiones editoriales, no sólo colores y tipografía. No se promete edición universal ni cero fallos.

## Evidencia de partida y supuestos

- Host Codex. Último commit observado: `271e604a97ba41567abd109a68645bdce0f3a49d`, rama `claude/plataforma-v2`, con abundantes cambios locales previos que deben preservarse.
- `src/preferences.ts` define cuestionario, catálogo y aplicación determinista de preferencias; cada plan guarda snapshot. No hay procedencia por campo ni aprendizaje registrado.
- `app/_lib/proposalPlan.ts` filtra elementos permitidos; `app/_lib/propose.ts` pide decisiones sobre texto. Fotos manuales. El renderer soporta más que el planificador.
- `scripts/pink_edit.py` sin plan crea uno vacío. `scripts/worker.py:202` termina análisis en `ready_to_edit`. `app/_components/Editor.tsx:370` y `:379` separan render y propuesta; esta última no se guarda automáticamente.
- `scripts/transcribe.py:129` YA usa VAD de faster-whisper para detectar voz sin texto en modo mixto. No agregar Silero como si no existiera; comprobar versión/proveedor y cobertura antes de extenderlo.
- `scripts/review_frames.py` ya selecciona muestras por captions/tarjetas/fondos. `scripts/heads.py` estima encuadre desde matte. Reutilizar antes de introducir detectores.
- `docs/CATALOGO_MARCA.md` y el QC local registran otro video de 48.5 s, con 136 palabras reconocidas conservadas y voz mixta pendiente de revisión. QC técnico no equivale a reconocimiento completo ni aprobación editorial.
- Tipo de piloto: persona hablando a cámara, vertical, máx. 120 s/500 MB según contrato actual. Música sigue fuera por decisión previa; preservar orden y voz salvo autorización editorial futura explícita.
- La clave/API real, corpus de evaluación humana y preferencias a partir de referencias NO se consideran verificados por existir código.

Fuentes primarias: https://captions.ai/help/guides/advanced/ai-edit-styles ; https://www.opus.pro/brand-templates ; https://github.com/remotion-dev/skills ; https://github.com/Breakthrough/PySceneDetect ; https://github.com/google-ai-edge/mediapipe ; https://github.com/AcademySoftwareFoundation/OpenTimelineIO ; https://github.com/OpenCut-app/OpenCut . Son documentación/código público, no evidencia del backend privado de competidores.

## Decisión arquitectónica

Conservar Remotion + PLAN/STYLE + pipeline Python. Añadir contratos y proveedores acotados; no reemplazar motor ni incorporar un editor completo. La base de conocimiento inicial será Markdown/JSON versionado con fuentes y reglas, sin base vectorial ni fine-tuning hasta justificar su necesidad.

Orden de autoridad: invariantes de fidelidad/accesibilidad → instrucciones explícitas para el video → reglas explícitas del creador → preferencias aprendidas confirmadas → referencias inferidas → valores por defecto. Un valor inferido nunca sustituye silenciosamente una prohibición explícita.

## Paquetes propuestos, en orden

### A. Perfil editorial versionado y compilador determinista (sin nuevos medios)

Responsabilidad: `src/preferences.ts`, catálogo y adaptador de preferencias en Python. Diseñar `profile_version`, procedencia por regla (`explicit`, `reference`, `feedback`, `default`), alcance, evidencia y estado (`suggested`, `confirmed`, `revoked`). Separar política editorial de opciones visuales. El snapshot por video conserva versión y resolución aplicada; nunca reescribir videos anteriores al cambiar el perfil.

Inicio pequeño: opciones existentes (gráficos permitidos, color, sonido, captions, transición) y restricciones todavía incompletas que hay que implementar (densidad temporal y solapes). Pausas y políticas de zoom nuevas se habilitan sólo con implementación y prueba en ambos lenguajes. Migración: lectura compatible de perfiles actuales → representación normalizada; no degradar silenciosamente v2 a un perfil v1 perdiendo reglas. No cambiar defaults en una migración. Un perfil ausente se distingue de uno inválido; el inválido detiene el trabajo antes de una llamada facturable.

Aceptación: mismo perfil y transcript producen iguales restricciones; conflicto explícito/inferido resuelto según precedencia; desactivar gráficos/sonido elimina las clases generadas gobernadas por el toggle, salvo una excepción por video explícita y registrada; perfiles antiguos conservan el resultado; cada regla visible tiene efecto comprobable. Compilar reglas una vez a un JSON resuelto versionado que Python consume; fixtures y golden outputs compartidos en archivos, sin duplicar el compilador en dos lenguajes.

### B. Registro de correcciones y comparación A/B (sin inferir gusto todavía)

Responsabilidad: editor, versionado de planes y contrato futuro de persistencia. Registrar `decision_id`, elemento/campo, antes/después, motivo opcional, intervalo, perfil/plan de origen y alcance `this_video` o `future_videos`. Una corrección local nunca actualiza perfil. La opción de recordar debe ser explícita, reversible y mostrar qué regla cambia. No ajustar pesos automáticamente con una sola preferencia A/B ni aprender de errores técnicos como si fueran gusto.

Comparar MISMO clip y punto temporal bajo dos estilos, conservando todo excepto parámetros comparados. Usar fixture sintético/local separado. No confundir una galería de videos distintos con una prueba de gusto. Guardar/reabrir/revocar e aislamiento entre usuarios son criterios de aceptación. Especificar migración y política de acceso antes de implementar nube.

### C. Calidad con evidencia y revisión visual del MP4 final (avance posible ahora)

Reutilizar QC y VAD existentes con extensiones explícitas: el VAD actual cubre sólo modo mixto, omite huecos menores de 1.2 s y sus alertas no bloquean la entrega. review_frames.py genera stills de Remotion; reutilizar su selección parcialmente, pero decodificar MP4 final para QC de entrega. Contrato de hallazgo: código, severidad, intervalo, evidencia local, detector/versión, cobertura, limitaciones y reparación permitida. Estados separados: `technical_pass`, `editorial_review_required`, `delivery_approved`; ninguna ausencia de detección implica calidad garantizada.

Checks deterministas: decodificación, duración, picos, silencio, palabras según plan, geometría dentro de lienzo, densidad y cumplimiento de preferencias. Visión: OCR de cuadros para texto recortado, detección real por frame de rostro y solapes con cajas conocidas; medir tasa de falsos positivos/negativos con fixtures anotados. La caja actual de heads.py es una heurística de silueta, no detección facial: una franja del 14 % de alto y una unión por toma con coordenadas recortadas. No sirve de ground truth. Comparar MediaPipe/modelo concreto con un baseline anotado antes de adoptarlo; conservar cajas sin clamp para detectar recorte. No confiar en detector de rostro como juez de estética.

Muestreo: inicio/medio/fin de cada elemento; extremos de zoom; fronteras de toma ±2 frames; captions largas y ventanas señaladas por ASR. Muestrear MP4 exportado, no sólo capturas de preview. Conservar lista de motivos por frame para evitar que una muestra de tarjeta borre la de caption; añadir cortes de color y mantener aspect ratio/letterbox en referencias. Señalar cobertura parcial. Reparaciones inicialmente deterministas y máximo 2 iteraciones (recolocar o quitar elemento opcional); nunca borrar habla ni alterar transcript para conseguir pass. Si no puede reparar, conservar archivo y evidencia, detener entrega automática. Revisión audiovisual semántica del modelo como señal adicional, no aprobación única.

Aceptación: fixtures de rostro al borde, caption fuera del lienzo, voz sin transcript, gráfico prohibido, audio con clipping y video sano; detección esperada y controles negativos; reparar no introduce nuevo fallo ni excede presupuesto. Clips sintéticos validan mecánica; corpus del usuario valida gusto.

### D. Orquestación automática local (después de A/C y prueba del proveedor)

Máquina de estados propuesta: ingest → analyze → propose → validate → layout → draft-render → review → repair (máx. 2) → final-render/QC → ready, o needs-review/failed. Los hooks del worker deben conservar cola actual y permitir piloto detrás de una bandera. Modelo elegido configurable y observado en cada ejecución; Claude Opus 5.5 es solicitado para revisión editorial, su superioridad no se da por medida.

Idempotencia por source hash + profile version + plan version + pipeline version; checkpoints reutilizables sólo si coinciden dependencias. Presupuesto por trabajo (llamadas, tiempo y coste), timeout y reintentos acotados. Un timeout ambiguo no debe duplicar solicitudes costosas automáticamente. Prueba de caída/reinicio y reentrega sin duplicar. Un plan válido pero vacío debe distinguirse de fallo de propuesta y de estilo deliberadamente limpio.

Aceptación: un comando local con medios de prueba → archivo final + manifest reproducible + informe; fallos de API/ASR/render → estado recuperable; no emisión automática si hay evidencia de voz perdida. Antes de servicio real: E2E autenticado, cuotas/costes, storage y worker continuo.

### E. Analizar referencias y aprender (contrato ahora, calibración después)

PySceneDetect como candidato para cortes/escenas, medidas de texto y paleta, densidad gráfica, transiciones y audio. Cada medición con intervalo, fuente, herramienta, confianza y limitaciones; flash/zoom no se asume corte. Separar contenido de estilo: no copiar afirmaciones, logos, caras ni B-roll del video de referencia. El creador confirma qué dimensión quiere transferir y qué rechaza.

Calibración con grabaciones/referencias del usuario: split por creador y video entre desarrollo y evaluación reservada. Medir aceptación sin retoques, fidelidad factual, minutos de corrección, violaciones de preferencias, tiempo y coste por entrega aceptada. No entrenar modelo propio antes de disponer de estas etiquetas y demostrar insuficiencia de reglas/recuperación.

## Inspecciones con REA y referencias de interfaz

- Captions /styles: navegación Playwright y captura pasiva REA del catálogo público, clasificación y affordances. Evidencia de frontend; sin inferir algoritmos privados ni entrar a cuentas/subir material.
- App local /demo/estilo: REA DOM/accesibilidad/recursos y Playwright para los ocho pasos, persistencia demo y vistas 390×844/1440×1000. Perfil de navegador desechable, sin escribir perfil real.
- OpenCut Classic, auto-editor y OTIO: lectura de código público dirigida a undo, historial, rangos y tiempos; usar herramientas normales de repo, no decompilar fuentes disponibles. Análisis de ASAR sólo si existe artefacto concreto y una pregunta que el código fuente no resuelva.
- Mobbin: intentado, acceso rechazado por plan de pago. No fingir referencias obtenidas.
- Figma: tres pantallas conceptuales de Mi estilo, A/B y alcance de corrección; marcadas como concepto, sin afirmar funciones implementadas.

## Skills y toolchain

Skills existentes a aprovechar: remotion-best-practices/captions/markup y guía SaaS; reverse-engineer-anything; claudex-loop; figma-use/generate-design/create-new-file cuando corresponda. Playwright del runtime instalado, FFmpeg/Pillow locales. No instalar paquetes de producto ni modelos para esta investigación. CLI Claude temporal oficial sólo para compatibilidad de revisión; sin alterar instalación global ni configuración.

## Validación de esta entrega y futuras pruebas

Comandos actuales desde motion: `npm run typecheck`; `node scripts/test_brand_catalog.mjs`; `.venv/bin/python scripts/test_brand_catalog.py`. Resultado esperado: exit 0. Playwright debe visitar demo, recorrer ocho pasos en ambos tamaños, guardar únicamente localStorage demo y reabrirlo; reportar errores de página, desbordamiento y capturas. REA conserva Evidence IDs y cobertura limitada por ventana/origen.

Para A-D, los tests de aceptación descritos arriba son trabajo futuro y no se declaran existentes. Antes de implementar cada paquete, fijar nombres/comandos de pruebas y fixtures nuevos en su plan específico. Después de cambios de código ejecutar `graphify update .` desde raíz. Revisión de render requiere también reproducción/audio; cuadros aislados no prueban sincronía ni gusto.

## Instrucciones de cobertura para revisor independiente

Solicitamos revisión de arquitectura, orden de trabajo, personalización y criterios de prueba; especialmente riesgos editoriales y de visión. No ejecutar ni construir. No leer `.env*`, credenciales, `work/`, `public/client/`, transcripts ni medios privados. Los paths de código arriba fueron localizados por Graphify antes de leerlos; inspeccionar sólo esos archivos ya localizados y este plan, sin búsquedas amplias. El grafo está en la carpeta padre y este runner sólo ofrece Read/Glob/Grep, por lo que cualquier exploración nueva que requiera Graphify queda a cargo del host. Reportar limitaciones. No atribuir calidad audiovisual a una revisión de texto.


## Requisitos de cierre incorporados tras revisión Opus 5.5

Estos requisitos precisan los paquetes anteriores y son puertas obligatorias, no funciones ya implementadas.

### R1. Fidelidad al perfil y migración (F1, F10, F13)

Perfil con versión desconocida, JSON roto o regla inválida → needs-review local, sin propuesta por defecto ni gasto IA. En nube mantener un estado compatible visible hasta desplegar los nuevos campos; nunca convertirlo en perfil ausente. Lectores/validators/worker compatibles primero; escritor UI/API después. Probar lector antiguo frente a v2 y reinicio con perfil corrupto. Mantener reglas/historial/evidencia en almacenamiento separado y con propietario; `profiles.preferences` actual tiene límite 4096 bytes. Snapshot compacto con IDs/versiones, límites explícitos y mensaje específico de tamaño. Compilador único → `resolved_profile.json` validado por consumidores TS/Python. Golden fixtures comunes, no dos copias inline divergentes.

### R2. Preferencias, invariantes y procedencia de cada evento (F2, F4, F5)

Añadir `origin=model|user|qc_repair|default|unknown`, `locked`, `decision_id` y `profile_version` por evento. Eventos antiguos sin procedencia reciben origin=unknown y quedan protegidos hasta confirmación; no se presume que son del modelo. Si chocan con graphics=none u otra regla, el usuario decide conservar como excepción o retirar antes de autoentrega. Para re-proponer sobre un plan antiguo se ofrece una acción única explícitamente confirmada para clasificar los eventos seleccionados como reemplazables por modelo. Si no acepta, se preservan y el resultado es needs-review por procedencia pendiente, no degraded_all_candidates_rejected por defecto. Fixtures: legacy+graphics=none y legacy+re-propose. Proponer de nuevo sólo reemplaza eventos del modelo desbloqueados; fotos/ajustes del usuario se conservan. Una reparación de QC no convierte un evento del usuario en editable por el modelo.

Semántica inicial: `graphics=none` gobierna tarjetas, fotos y fondos generados; `vibe=clean` evita cortes de color generados; zooms, transiciones y captions tienen políticas propias. `sfx=none` gobierna TODOS los efectos no vocales, incluidas transiciones. Excepciones explícitas por video se registran como tales; un evento manual no es automáticamente permiso para contradecir una prohibición del perfil. Al aplicar un perfil nuevo a un plan existente, mostrar/registrar qué elementos generados se retiran y qué excepciones confirmadas se conservan. Conflicto con invariantes de fidelidad/legibilidad → revisión, incluso si es manual.

Densidad determinista: contar entradas de cuts/cards/backgrounds/zooms en cada ventana móvil de 10 s usando fps del timeline; las transiciones de toma tienen política aparte y no se cuentan dos veces como zoom. Límite según perfil resuelto. Ordenar candidatos por prioridad editorial y cronología, sin usar slice del orden arbitrario del modelo. Validar solapes de tarjetas/cortes y exclusividad de palabras entre esas intervenciones; fondo+tarjeta puede compartir intervalo si está previsto, cuenta como dos entradas. Estas semánticas corresponden a pipeline_version=2 y quedan registradas en el snapshot. Reexportar un plan v1 existente conserva su comportamiento histórico y golden de render; no se aplica retrospectivamente el nuevo presupuesto. Pasar a v2 exige una nueva versión de plan y aceptación del cambio de política (incluye zooms y cuenta fondo+tarjeta como dos). Autopilot sólo se habilita en v2; v1 se mantiene como replay asistido, sin prometer los gates nuevos. Regla equivalente en planificador, validación y QC; no confiar en el prompt. Añadir fixtures de sobrepropuesta, eventos en bordes de ventana, locks y colisiones con eventos del usuario.

### R3. Propuesta parcial y límite entre instrucciones y contenido (F3, F14)

Excluir `photo` del enum enviado al modelo hasta implementar un proveedor con assets/atribución válidos. Un contador sin cifra respaldada, beat fuera de rango o evento inválido se rechaza individualmente con diagnóstico; no inventar cifra ni reparar semántica a ciegas. Resto de propuesta válida puede continuar si conserva intención mínima. Diferenciar `clean_by_preference`, `valid_no_emphasis` y `degraded_all_candidates_rejected`; el último no es éxito automático. Presupuesto de una nueva propuesta acotado.

Instrucciones de autoridad por video sólo desde control estructurado y confirmado de UI. Transcript, textos de referencia, notas libres y motivos son datos o candidatos a regla, no instrucciones que elevan permisos. Convertir «no uses rojo» de notas a regla tipada requiere confirmación y comprobación posterior. Fixture con transcript que pide ignorar preferencias no debe cambiar políticas ni usar recursos prohibidos.

### R4. Cobertura de voz y geometría de entrega (F6, F11, F12)

Ejecutar VAD/coverage en todos los idiomas sobre fuente y audio del MP4 exportado. Mapear intervalos fuente→salida usando rangos conservados y base temporal; comparar con palabras esperadas y regiones excluidas autorizadas. Huecos cortos se reportan graduados, no se descartan sin rastro. `transcription_uncertain` se separa de `lost_speech_evidence`: el review_required=true de modo mixto no equivale automáticamente a pérdida de voz. Mientras no exista calibración, incertidumbre relevante requiere revisión; no cambiar a es sólo para evitar el gate.

Frames anotados con rostro cerca de bordes, manos elevadas, oclusión, zoom extremo y controles sanos. Umbral provisional para adoptar detector: recall ≥95 % de violaciones conocidas y falsos positivos ≤10 % en al menos 20 positivos/20 negativos sintéticos o anotados; se publica tamaño muestral y estos valores no equivalen a precisión de producción. Ningún falso negativo de recorte severo de ojos/boca en fixtures críticos. No cara detectada = desconocido, nunca pass. Un resultado bajo umbral no habilita autoentrega; se revisa detector o se mantiene revisión manual. Definir métricas y calibrar sobre originales reales después. OCR con confianza baja o discrepante produce alerta, no corrección automática del discurso.

### R5. Estados, presupuesto y caches (F7, F8, F9)

Piloto local: stages nuevos en manifest propio; no insertarlos en los enums actuales de DB. Antes de nube, migración aditiva para `engine_stage`/`qc_state` y metadata de procedencia/versionado; conservar `jobs.kind=analyze|render` como trabajo externo con subetapas internas y `edit_plans.source=auto|user`, usando columna metadata para origen más fino. `videos.status` conserva valores existentes: needs-review se representa con `ready_to_edit` + qc_state y mensaje; fallos reales con failed. Mantener índice de un trabajo activo por video. Actualizar etiquetas UI, recuperación y mapeo de errores; probar filas antiguas y worker durante despliegue de lectores antes de escritores.

Presupuesto por cuenta Y trabajo en worker/claim y ledger del servidor, reservado atómicamente antes de cualquier llamada IA; idempotency key evita doble cargo lógico. Rutas Next no son la única defensa porque hoy se pueden insertar jobs propios vía Data API. Prueba de inserción REST directa y carrera entre dos workers debe respetar cuota; reintentos ambiguos quedan reconciliables, sin relanzar gasto a ciegas. No activar automatización nube hasta pasar este gate.

Invalidación explícita: transcript depende de source hash, modelo/versión ASR, idioma y vocabulario; matte de source hash/modelo/parámetros; heads de matte hash, timeline y versión del estimador; poster de source hash/tiempo; snapshot del plan de versión de perfil/pipeline; render de todos los hashes efectivos. Reanalizar con perfil nuevo crea un borrador de plan en una versión nueva, conserva la versión anterior recuperable y traslada eventos user/locked/unknown según R2. Registrar los elementos generados retirados. Nunca sobrescribir el plan editado en sitio ni cambiar silenciosamente su versión activa. --preferences se aplica al borrador nuevo, no al plan anterior. Fixture: plan editado + perfil nuevo + reanálisis conserva eventos protegidos y versión previa. Pruebas de caché deben modificar una dependencia cada vez y comprobar reutilización/invalidación esperadas.

## Evidencia adicional del host tras ronda 1

Playwright recorrió ocho pasos desktop/móvil y confirmó persistencia demo tras hidratación. Apple Vision local detectó una cara en 11 muestras de MP4 finales existentes y marcó un solape de caption con barbilla en la muestra a 2 s del segundo video; inspección visual confirmó la posición. OCR también se equivocó en una palabra legible: evidencia a favor de alertas graduadas. No se probó audio ni se editó un video nuevo. El diseño Figma es conceptual. Estos resultados no sustituyen las pruebas futuras de A-D.


### R6. Despliegue y autoría de procedencia (segunda revisión, N4)

Lectores antes de escritores también para campos de eventos: esquema JSON, validador TS, consumidor Python y renderer deben aceptar/conservar nuevos metadatos antes de que API/editor/planificador los emitan. Verificar unknown-key y round-trip sin pérdida. El servidor asigna origin/locked/decision_id según acción autenticada: propuesta, edición de usuario o reparación; estos campos quedan fuera del esquema de salida del modelo y no se confía en valores arbitrarios del cliente. Una herramienta/modelo nunca puede declararse user o bloquear eventos. Fixtures: salida del modelo que intenta origin=user, lector anterior frente a evento nuevo, round-trip y plan antiguo sin procedencia. Modo local usa la misma capa de asignación del servicio, aunque no haya cuentas.
