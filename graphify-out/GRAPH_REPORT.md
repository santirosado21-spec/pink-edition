# Graph Report - motion  (2026-11-02)

## Corpus Check
- 323 files · ~220,573 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .ttf 14, (none) 4, .css 4)

## Summary
- 2284 nodes · 4839 edges · 137 communities (112 shown, 25 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 84 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3fa13846`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- profile.ts
- dependencies
- contextualProposal.ts
- json
- 03 · Cómo resuelven CapCut, Submagic, Captions, Descript y OpusClip cinco problemas
- properties
- test_personalization_contract.mjs
- prepare_full_demo.py
- localUploadSession.ts
- cards.tsx
- package.json
- cloud.ts
- Editor.tsx
- load_ts.mjs
- zooms.ts
- Plan de implementación pendiente: Cutkind
- corpus_add.py
- Cloud
- Motor con Sol y preferencias editoriales antes de editar
- app/estilo/page.tsx
- fran_loop.py
- verify
- ref_node_os
- stockPhotos.ts
- transcribe.py
- properties
- CorpusAddTests
- Brand
- PinkLoopTests
- candidates.ts
- subprocess
- pink_loop.py
- native_layout.py
- ref_node_fs
- StylePlayground.tsx
- OneShotVideo.tsx
- one_shot_worker.py
- supabase/config.ts
- media_intake.py
- compilerOptions
- sys
- edit.ts
- jobs.ts
- Pink.ai: catálogo editorial de tarjetas
- De los videos de la agencia de Fran a producción independiente del Mac
- intro_blur
- properties
- beat
- items
- Conseguir una edición real antes de ampliar la autonomía
- Registro de implementación
- PinkEdit
- properties
- SolModelTests
- test_contextual_proposal.mjs
- compilerOptions
- pathlib
- test_caption_pages.mjs
- PinkEdit.tsx
- fit
- Investigación: autonomía basada en el estilo del creador
- constrain_events
- test_personalization_browser.mjs
- ref_node_path
- render/route.ts
- propose.ts
- Pink.ai: reglas de edición y contrato STYLE / PLAN
- Umbral — estilo adicional 001
- LocalIntake.tsx
- Plan de autonomía personalizada — propuesta para revisión
- Variedad editorial para Cutkind
- Ejecución local desde la sesión temporal
- Qué mejorar antes de cambiar de modelo
- autonomia-2026-10-15/INVESTIGACION.md
- decorate
- Fidelidad a la personalización: primer incremento
- StockRelevanceTest
- Reglas para agentes y colaboradores
- Preferences
- Cutkind: cuentas y pagos
- Cutkind — identidad e interfaz
- Evidencia de la investigación
- Fotos para el video: Wikimedia sin clave y proveedores opcionales
- Registro del plan
- Pink Edition
- preferences.ts
- test_style_selection.mjs
- test_editorial_step.mjs
- Registro Claudex — autonomía personalizada
- Paquetes propuestos, en orden
- Requisitos de cierre incorporados tras revisión Opus 5.5
- Trabajo que puede avanzar sin nuevas grabaciones
- Revisión del plan de edición real
- Primer incremento — versiones y exportación
- Probar Pink.ai con otro video
- preferences
- Propuesta de precios de Cutkind
- CapCut y Canva: muestras estáticas para Cutkind
- Landing de Pink.ai
- detect_faces.swift
- style
- kind
- theme
- SoundTests
- vercel.json
- Revisión del plan Fran → producción
- Integración local — 20 octubre 2026
- editor-font/[id]/route.ts
- billing.ts
- text
- top
- Despliegue web en Hostinger
- Alcance de inspección fresca
- Fuentes locales del editor
- AUDIO_ASSETS.md
- CLAUDE 2.md
- CUTKIND_EMAIL_DNS.md
- CLAUDEX-FEEDBACK-1.md
- CLAUDEX-FEEDBACK-2.md
- FICHA_DE_MARCA.md
- INSPECCION.md
- PRUEBAS.md
- next.config.mjs
- make_style_examples.py
- last_word_id
- meaning
- test_brand_catalog.mjs
- Prueba local con tarjetas e integración de modelos
- test_static_style_samples.mjs
- Recursos visuales: CapCut y Canva
- Cuestionario rápido con decisiones ejecutables
- CUESTIONARIO-CLAUDE-GRAFICOS-2026-10-27.md

## God Nodes (most connected - your core abstractions)
1. `react` - 29 edges
2. `supabaseServer()` - 27 edges
3. `CLOUD` - 26 edges
4. `Preferences` - 26 edges
5. `remotion` - 25 edges
6. `main()` - 24 edges
7. `sameOrigin()` - 23 edges
8. `loader()` - 22 edges
9. `PinkEdit()` - 22 edges
10. `Brand()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Compatibilidad de archivos` --references--> `readActiveEdit()`  [INFERRED]
  docs/implementacion/editor-autonomo-2026-10-20/AVANCE.md → app/_lib/planStore.ts
- `Ollama conectado al editor — 19 de octubre de 2026` --references--> `evaluateProposal()`  [INFERRED]
  docs/estrategia/edicion-real-2026-10-19/IMPLEMENTACION.md → app/_lib/proposalPlan.ts
- `A. Perfil editorial versionado y compilador determinista (sin nuevos medios)` --references--> `feedback()`  [INFERRED]
  docs/estrategia/autonomia-2026-10-15/PLAN.md → scripts/media_intake.py
- `W2 · Codex + Gemma — ingreso al corpus` --references--> `inspect()`  [INFERRED]
  docs/estrategia/mapa-2026-11-02/MAPA.md → scripts/media_intake.py
- `OpenCut Classic` --references--> `history()`  [INFERRED]
  docs/estrategia/autonomia-2026-10-15/INSPECCION-CODIGO-ABIERTO.md → scripts/pink_loop.py

## Import Cycles
- None detected.

## Communities (137 total, 25 thin omitted)

### Community 0 - "profile.ts"
Cohesion: 0.18
Nodes (19): dynamic, GET(), PUT(), dynamic, Page(), ENGINE_HERE, readProfile(), saveProfile() (+11 more)

### Community 1 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, @anthropic-ai/sdk, next, react, react-dom, remotion, @remotion/captions, @remotion/cli (+8 more)

### Community 2 - "contextualProposal.ts"
Cohesion: 0.13
Nodes (22): contextualFormat, exec, literalPhotoMoment(), locateQuote(), normalize(), PHOTO_INTENTS, photoQueries, proposeContextualPlan() (+14 more)

### Community 3 - "json"
Cohesion: 0.08
Nodes (27): Base de datos, check_limits(), conform(), enter(), main(), parse(), probe(), render_output() (+19 more)

### Community 4 - "03 · Cómo resuelven CapCut, Submagic, Captions, Descript y OpusClip cinco problemas"
Cohesion: 0.04
Nodes (39): 01 · Auditoría técnica de Pink.ai, 1. Qué hay hoy, 2. Cómo fluye un video, 3. Tiempos medidos, 4. Verificaciones de esta auditoría, 5. Riesgos y deuda, por prioridad, 6. Lo que hay que conservar, 02 · Mapa de dependencias y licencias (+31 more)

### Community 5 - "properties"
Cohesion: 0.04
Nodes (49): pattern, type, maxLength, type, description, enum, const, type (+41 more)

### Community 6 - "test_personalization_contract.mjs"
Cohesion: 0.05
Nodes (36): atomicDir, before, bg, blockedUpload, card, cases, { checkPreferences }, client (+28 more)

### Community 7 - "prepare_full_demo.py"
Cohesion: 0.08
Nodes (24): align_all_words(), caption_face(), caption_pages(), layout_tokens(), main(), normalize(), phrase_ranges(), repaginate() (+16 more)

### Community 8 - "localUploadSession.ts"
Cohesion: 0.16
Nodes (29): PUT(), run, runtime, GET(), runtime, DELETE(), POST(), runtime (+21 more)

### Community 9 - "cards.tsx"
Cohesion: 0.12
Nodes (39): useTheme(), Alert(), BeforeAfter(), Bill(), Body(), Canvas(), CardProps, cards (+31 more)

### Community 10 - "package.json"
Cohesion: 0.05
Nodes (62): metadata, viewport, description, devDependencies, prettier, @types/node, @types/react, @types/web (+54 more)

### Community 11 - "cloud.ts"
Cohesion: 0.11
Nodes (35): Context, PUT(), Context, GET(), POST(), Context, dynamic, GET() (+27 more)

### Community 12 - "Editor.tsx"
Cohesion: 0.06
Nodes (34): CandidateReview(), AnyEvent, CAPTION_NAMES, clock(), CUT_STYLES, Editor(), Group, GROUPS (+26 more)

### Community 13 - "load_ts.mjs"
Cohesion: 0.06
Nodes (38): load, previousCwd, { editorAiFingerprint }, load, plan, { proposePlan }, response, timeline (+30 more)

### Community 14 - "zooms.ts"
Cohesion: 0.14
Nodes (17): Measurement, pending, run, withFaceSafety(), protectedHead(), safeCardTop(), autoZooms(), frameTransform() (+9 more)

### Community 15 - "Plan de implementación pendiente: Cutkind"
Cohesion: 0.06
Nodes (31): Almacenamiento temporal: recepción implementada, ejecución/exportación pendientes, Ampliación: múltiples videos sin tope de peso, Cambio de contrato: primera edición completa, Cambios y comprobación de este turno, Flujo acordado, Mínimos de esta prueba, Prioridad revisada de implementación, Qwen: decisión basada en una prueba válida (+23 more)

### Community 16 - "corpus_add.py"
Cohesion: 0.17
Nodes (15): add_clip(), append_manifest(), build_parser(), choose_split(), corpus_dir(), CorpusError, fraction_to_fps(), infer_topic() (+7 more)

### Community 18 - "Motor con Sol y preferencias editoriales antes de editar"
Cohesion: 0.06
Nodes (28): Arquitectura online propuesta, Cinco direcciones editoriales para la primera prueba, Contrato entre cuestionario, Sol y render, Criterios de aceptación, Experiencia previa a la edición, Hallazgos comprobados, Límites de este análisis, Motor con Sol y preferencias editoriales antes de editar (+20 more)

### Community 19 - "app/estilo/page.tsx"
Cohesion: 0.21
Nodes (11): ProfileRecovery(), CatalogPreview, Options(), StyleQuiz(), titleOf(), DemoStyle(), metadata, dynamic (+3 more)

### Community 20 - "fran_loop.py"
Cohesion: 0.14
Nodes (10): archive(), gallery(), main(), preflight(), request(), save(), sha256(), wait() (+2 more)

### Community 21 - "verify"
Cohesion: 0.12
Nodes (5): kept_intervals(), map_time(), Coverage, SpeechCuts, verify()

### Community 22 - "ref_node_os"
Cohesion: 0.08
Nodes (20): catalog, {chromium}, require, brief, {DEFAULT_PREFERENCES}, dir, headers, load (+12 more)

### Community 23 - "stockPhotos.ts"
Cohesion: 0.15
Nodes (24): GET(), local(), POST(), runtime, COMMONS_CC0, commonsImageAllowed(), commonsPhoto(), Info (+16 more)

### Community 24 - "transcribe.py"
Cohesion: 0.10
Nodes (13): Catálogo y memoria de marca — prueba local, Colaboración y continuidad, Comprobaciones, Imagen y subtítulos, Opciones disponibles, BrandCatalogTests, chronological_segments(), fill_missing_times() (+5 more)

### Community 25 - "properties"
Cohesion: 0.09
Nodes (22): description, type, description, type, description, maxItems, type, uniqueItems (+14 more)

### Community 27 - "Brand"
Cohesion: 0.10
Nodes (32): Brand(), Home(), videoInfo(), InstallButton(), InstallEvent, statusLabel(), Theme, ThemePicker() (+24 more)

### Community 29 - "candidates.ts"
Cohesion: 0.21
Nodes (23): POST(), runtime, dynamic, GET(), runtime, createCandidate(), listCandidates(), readCandidate() (+15 more)

### Community 30 - "subprocess"
Cohesion: 0.11
Nodes (5): assert_ready(), environment(), request(), _request(), IsolatedRender

### Community 31 - "pink_loop.py"
Cohesion: 0.08
Nodes (42): Avance, Cada vuelta del loop, Dónde estamos, Fases y puertas de salida, Fuera de alcance por ahora, Mapa de trabajo: de «QC técnico en verde» a «lo publicarías», Métrica, Próximo paso (+34 more)

### Community 32 - "native_layout.py"
Cohesion: 0.18
Nodes (8): longest_safe_run(), overlay_top(), prepare_native_layout(), framing_for_faces(), interpolate_framing(), prepare_portrait_framing(), LayoutTest, FramingTests

### Community 33 - "ref_node_fs"
Cohesion: 0.08
Nodes (21): [folder, origin], status(), statusQueue, write(), edit, evidence, [folder,origin='http://localhost:3001'], inputProps (+13 more)

### Community 34 - "StylePlayground.tsx"
Cohesion: 0.24
Nodes (7): StylePlayground(), metadata, Page(), OneShotVideoProps, DEFAULT_PREFERENCES, keys, styleSelectionUrl()

### Community 35 - "OneShotVideo.tsx"
Cohesion: 0.13
Nodes (27): FontPicker(), Causa y cambio, Corrección de dirección visual del loop de Fran, Prueba local, Rostro y recursos, @remotion/captions, captionIndex(), captionPage() (+19 more)

### Community 36 - "one_shot_worker.py"
Cohesion: 0.16
Nodes (14): atomic(), clean(), command(), editorial_model(), find_stock(), get_json(), main(), music() (+6 more)

### Community 37 - "supabase/config.ts"
Cohesion: 0.24
Nodes (12): GET(), GET(), POST(), requireAccount(), requireOnboarding(), profileDestination(), CLOUD, SUPABASE_KEY (+4 more)

### Community 38 - "media_intake.py"
Cohesion: 0.17
Nodes (11): apply_feedback(), digest(), feedback(), inspect(), record_feedback(), reference_directions(), route(), schema() (+3 more)

### Community 39 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 40 - "sys"
Cohesion: 0.13
Nodes (8): pcm(), pcm(), pcm(), main(), measure(), person_alpha(), probe_size(), head_key()

### Community 41 - "edit.ts"
Cohesion: 0.11
Nodes (20): Scene(), AlignedWord, Anchor, asset(), BackgroundEvent, buildEdit(), CardEvent, CutEvent (+12 more)

### Community 42 - "jobs.ts"
Cohesion: 0.15
Nodes (20): Context, GET(), cloudDownload(), alive(), at(), backfillHeads(), dir(), join() (+12 more)

### Community 43 - "Pink.ai: catálogo editorial de tarjetas"
Cohesion: 0.11
Nodes (16): `alert`, `beforeafter`, `bill`, `body`, `compare`, `counter`, Decisión: frase hablada → tarjeta, `emergency` (+8 more)

### Community 44 - "De los videos de la agencia de Fran a producción independiente del Mac"
Cohesion: 0.11
Nodes (17): De los videos de la agencia de Fran a producción independiente del Mac, Etapa 1 — Recibir todo, elegir un primer lote controlado, Etapa 2 — Laboratorio de pruebas y criterio editorial, Etapa 3 — Convertir correcciones en reglas y demostrar generalización, Etapa 4 — Trasladar el procesamiento y probar con la Mac apagada, Etapa 5 — Piloto privado y aumento gradual, Fuentes y límites de recomendación, Objetivo y decisión recomendada (+9 more)

### Community 45 - "intro_blur"
Cohesion: 0.11
Nodes (18): description, minimum, type, additionalProperties, description, properties, required, type (+10 more)

### Community 46 - "properties"
Cohesion: 0.11
Nodes (18): description, minimum, type, properties, description, minLength, type, description (+10 more)

### Community 47 - "beat"
Cohesion: 0.12
Nodes (17): description, minLength, type, additionalProperties, description, properties, required, type (+9 more)

### Community 48 - "items"
Cohesion: 0.19
Nodes (17): items, description, items, type, items, description, items, type (+9 more)

### Community 49 - "Conseguir una edición real antes de ampliar la autonomía"
Cohesion: 0.12
Nodes (15): 0. Prueba de conexión y diagnóstico visible, 1. Un video de referencia de calidad, completo y reproducible, 2. Automatizar esa misma ruta comprobada, 3. Darle visión y recursos expresivos, 4. Revisión audiovisual y corrección limitada, 5. Aprender preferencias después de demostrar edición, Conclusión, Conseguir una edición real antes de ampliar la autonomía (+7 more)

### Community 50 - "Registro de implementación"
Cohesion: 0.12
Nodes (14): Correcciones tras inspección1, Implementación y pruebas del host, Inspección1 (sesión fresca), Inspección final 2 — cierre, Plan ronda2, Plan ronda3 aprobado, Plan, ronda 1, Registro de implementación (+6 more)

### Community 51 - "PinkEdit"
Cohesion: 0.09
Nodes (24): Pink Edition / Pink.ai — instrucciones compartidas, 1. Que el motor edite cualquier video — hecho, 2. Propuesta editorial automática, 3. Catálogo de gráficos genéricos, 4. Editor, 5. Procesador, 6. Servidor (a cargo de Santiago), Acceso por invitación (modo nube) (+16 more)

### Community 52 - "properties"
Cohesion: 0.12
Nodes (16): description, minLength, type, additionalProperties, properties, required, type, alt (+8 more)

### Community 53 - "SolModelTests"
Cohesion: 0.15
Nodes (4): strict_schema(), SolModelTests, run(), run()

### Community 54 - "test_contextual_proposal.mjs"
Cohesion: 0.13
Nodes (12): {DEFAULT_PREFERENCES}, direction, env, fakePhoto, {flatWords}, load, plan, {proposeContextualPlan,locateQuote} (+4 more)

### Community 55 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution, noEmit (+6 more)

### Community 56 - "pathlib"
Cohesion: 0.18
Nodes (7): loudness(), main(), run(), font_style(), repaginate(), main(), probe()

### Community 57 - "test_caption_pages.mjs"
Cohesion: 0.29
Nodes (6): captions, long, phraseCaptions, phraseSeen, seen, texts

### Community 58 - "PinkEdit.tsx"
Cohesion: 0.24
Nodes (14): @remotion/media, BackgroundEffects(), Motif(), ColorCuts(), Cut(), CaptionPage, useEdit(), ClipSeries() (+6 more)

### Community 59 - "fit"
Cohesion: 0.40
Nodes (4): Base comprobada y supuestos, C1. Persistencia y contratos remotos, fit(), shrink()

### Community 60 - "Investigación: autonomía basada en el estilo del creador"
Cohesion: 0.15
Nodes (13): Base de conocimiento propuesta, Cierre de revisión independiente, Conclusión, Diseño conceptual, Fuentes complementarias, Investigación: autonomía basada en el estilo del creador, Lo que cambió después de la revisión de Claude, Lo que puedo avanzar antes de las grabaciones (+5 more)

### Community 61 - "constrain_events"
Cohesion: 0.13
Nodes (9): constrain_events(), director_input(), event_limits(), DirectorTest, ControlsTest, VisualPreferencesTest, allowed_event(), materialize_stills() (+1 more)

### Community 62 - "test_personalization_browser.mjs"
Cohesion: 0.11
Nodes (13): bundled, module, preset, require, root, card, initial, output (+5 more)

### Community 63 - "ref_node_path"
Cohesion: 0.09
Nodes (15): folder, root, sounds, clips, full, lengths, preview, root (+7 more)

### Community 64 - "render/route.ts"
Cohesion: 0.60
Nodes (4): Context, POST(), cloudRender(), sourceFile()

### Community 65 - "propose.ts"
Cohesion: 0.09
Nodes (28): Candidate, DENSITY, enums, evaluateProposal(), FlatWord, flatWords(), Group, GROUPS (+20 more)

### Community 66 - "Pink.ai: reglas de edición y contrato STYLE / PLAN"
Cohesion: 0.29
Nodes (7): Capas y sonido, Límites y decisiones abiertas, Pink.ai: reglas de edición y contrato STYLE / PLAN, Pipeline previsto, Preferencias del creador, Reglas comprobables, Separación y migración

### Community 67 - "Umbral — estilo adicional 001"
Cohesion: 0.18
Nodes (10): Análisis conjunto de los cuatro tutoriales, Biblioteca ampliada de referencias, Consejos de edición extraídos de la quinta referencia, Continuidad y fundamentos de captura — referencias sexta y séptima, Decisión de producto — 19 de octubre de 2026, Entrega, Recursos, Revisar localmente (+2 more)

### Community 68 - "LocalIntake.tsx"
Cohesion: 0.25
Nodes (11): LocalExecutionPanel(), LocalIntake(), moods, Readiness, INTAKE_PRESETS, QUICK_AUDIENCE, QUICK_OBJECTIVE, quickPreferences() (+3 more)

### Community 69 - "Plan de autonomía personalizada — propuesta para revisión"
Cohesion: 0.20
Nodes (10): Decisión arquitectónica, Evidencia adicional del host tras ronda 1, Evidencia de partida y supuestos, Inspecciones con REA y referencias de interfaz, Instrucciones de cobertura para revisor independiente, Objetivo y alcance de esta entrega, Plan de autonomía personalizada — propuesta para revisión, R6. Despliegue y autoría de procedencia (segunda revisión, N4) (+2 more)

### Community 70 - "Variedad editorial para Cutkind"
Cohesion: 0.20
Nodes (9): Cinco familias completas, basadas en nuestra biblioteca, Cómo evitar que el modelo vuelva a una receta genérica, Formatos y compra de recursos, Hallazgo principal, Implementación priorizada y prueba, Primera biblioteca: 24 recursos propios a implementar, Referencias investigadas y qué aprender, Selección tipográfica (+1 more)

### Community 71 - "Ejecución local desde la sesión temporal"
Cohesion: 0.20
Nodes (9): Corrección de pausas internas — 20 de octubre, Ejecución local desde la sesión temporal, Estados y conservación, Flujo implementado, Imagen ausente en segunda toma y nueva dirección tipográfica, Medios y composición, Prueba con el lote recibido, Tipografía visible y aplicada — 20 de octubre (+1 more)

### Community 72 - "Qué mejorar antes de cambiar de modelo"
Cohesion: 0.20
Nodes (9): Cambios implementados, Conclusión, Continuación del loop · tarde del 27 de octubre, Cómo mejorar la grabación, Para probar, Qué mejorar antes de cambiar de modelo, Revisión visual y lo que falta, Validaciones (+1 more)

### Community 73 - "autonomia-2026-10-15/INVESTIGACION.md"
Cohesion: 0.22
Nodes (4): Aplicación a Cutkind, auto-editor, Inspección dirigida de código abierto, OpenCut Classic

### Community 75 - "Fidelidad a la personalización: primer incremento"
Cohesion: 0.25
Nodes (7): Archivos localizados con Graphify y cobertura autorizada, Cierre de segunda revisión, Contrato observable, Fidelidad a la personalización: primer incremento, Precisiones de revisión (prevalecen sobre ambigüedades anteriores), Riesgos deliberadamente acotados, Verificación

### Community 77 - "Reglas para agentes y colaboradores"
Cohesion: 0.20
Nodes (9): Clasificación de fuentes — 27 de octubre de 2026, Contrato de pruebas naturales — 27 de octubre de 2026, Cuestionario rápido — 28 de octubre de 2026, Cuestionario visual — decisión del usuario, 27 de octubre de 2026, Decisiones del usuario — 26 de octubre de 2026, Dirección editorial y variedad, Recursos elegidos en el cuestionario, Reglas para agentes y colaboradores (+1 more)

### Community 78 - "Preferences"
Cohesion: 0.16
Nodes (19): EditorialFamilyPicker(), descriptions, ResourceSample(), ResourceSampleKind, StaticStyleSample(), StylePreview(), StyleQuestionnaire(), futureOptions (+11 more)

### Community 79 - "Cutkind: cuentas y pagos"
Cohesion: 0.29
Nodes (6): Acceso temporal a la demo (15 de octubre de 2026), Antes de activar cobros, Cutkind: cuentas y pagos, Estado de esta entrega, Validación realizada, Variables

### Community 80 - "Cutkind — identidad e interfaz"
Cohesion: 0.25
Nodes (7): Cambios, Cutkind — identidad e interfaz, Dirección, Entrega y comprobaciones, Investigación de referencias, Retirada de la demo de Fran, Versión publicada

### Community 81 - "Evidencia de la investigación"
Cohesion: 0.29
Nodes (7): Bloqueos y límites, Cierre de revisión independiente, Evidencia de la investigación, Figma, Qué se validó, REA: observación pasiva reproducible, Visión sobre MP4 entregados anteriormente

### Community 82 - "Fotos para el video: Wikimedia sin clave y proveedores opcionales"
Cohesion: 0.29
Nodes (6): Configuración actual, Evidencia nueva: Wikimedia sin clave, Fotos para el video: Wikimedia sin clave y proveedores opcionales, Funcionamiento, Otras fuentes, Verificación histórica de Pixabay (19 de octubre)

### Community 83 - "Registro del plan"
Cohesion: 0.29
Nodes (6): Corrección: habilitar subida tras cuestionario, Ejecución del lote desde `/app`, Inicio autorizado, Registro del plan, Reorientación one-shot, Subida múltiple sin límite fijo de peso

### Community 84 - "Pink Edition"
Cohesion: 0.29
Nodes (6): Archivos principales, Colaborar con Claude, Exportar y verificar, Instalar y abrir, Material local y preparación, Pink Edition

### Community 85 - "preferences.ts"
Cohesion: 0.11
Nodes (25): CAPTIONS, Choice, CONTEXT, GRAPHICS, PRESETS, SOUNDS, STEPS, TOPICS (+17 more)

### Community 86 - "test_style_selection.mjs"
Cohesion: 0.22
Nodes (8): choice, {DEFAULT_PREFERENCES}, load, prefs, resourceChoice, resources, {styleSelectionUrl,readStyleSelection}, url

### Community 87 - "test_editorial_step.mjs"
Cohesion: 0.38
Nodes (5): captions, labels, activeEditorialStep(), normalize(), TimedWord

### Community 88 - "Registro Claudex — autonomía personalizada"
Cohesion: 0.33
Nodes (6): Inicio, Registro Claudex — autonomía personalizada, Ronda 1 — lanzada, Ronda 1 — resultado completo, Ronda 2 — resultado completo, Ronda 3 — aprobación final del plan

### Community 89 - "Paquetes propuestos, en orden"
Cohesion: 0.33
Nodes (6): A. Perfil editorial versionado y compilador determinista (sin nuevos medios), B. Registro de correcciones y comparación A/B (sin inferir gusto todavía), C. Calidad con evidencia y revisión visual del MP4 final (avance posible ahora), D. Orquestación automática local (después de A/C y prueba del proveedor), E. Analizar referencias y aprender (contrato ahora, calibración después), Paquetes propuestos, en orden

### Community 90 - "Requisitos de cierre incorporados tras revisión Opus 5.5"
Cohesion: 0.33
Nodes (6): R1. Fidelidad al perfil y migración (F1, F10, F13), R2. Preferencias, invariantes y procedencia de cada evento (F2, F4, F5), R3. Propuesta parcial y límite entre instrucciones y contenido (F3, F14), R4. Cobertura de voz y geometría de entrega (F6, F11, F12), R5. Estados, presupuesto y caches (F7, F8, F9), Requisitos de cierre incorporados tras revisión Opus 5.5

### Community 91 - "Trabajo que puede avanzar sin nuevas grabaciones"
Cohesion: 0.33
Nodes (5): Precisiones aceptadas de la revisión final, Primera decisión recomendada, Pruebas nuevas propuestas, todavía no existentes, Trabajo que puede avanzar sin nuevas grabaciones, Trabajo que sí necesita tus ejemplos

### Community 92 - "Revisión del plan de edición real"
Cohesion: 0.33
Nodes (5): Inspección de código 1 — 19 octubre, Inspección de código 2 y cierre del incremento, Revisión del plan de edición real, Ronda 1, Ronda 2 — cierre

### Community 93 - "Primer incremento — versiones y exportación"
Cohesion: 0.33
Nodes (5): Compatibilidad de archivos, Comportamiento disponible, Lo que todavía falta, Primer incremento — versiones y exportación, Verificación realizada

### Community 94 - "Probar Pink.ai con otro video"
Cohesion: 0.33
Nodes (5): Pasos, Probar Pink.ai con otro video, Qué mirar, Qué reportar, Qué video usar

### Community 95 - "preferences"
Cohesion: 0.40
Nodes (5): additionalProperties, description, required, type, preferences

### Community 96 - "Propuesta de precios de Cutkind"
Cohesion: 0.40
Nodes (4): Propuesta, Propuesta de precios de Cutkind, Referencias verificadas, Validación antes de cobrar

### Community 97 - "CapCut y Canva: muestras estáticas para Cutkind"
Cohesion: 0.14
Nodes (12): Aplicación propuesta en Cutkind, CapCut y Canva: muestras estáticas para Cutkind, Evidencia REA, Hallazgos y procedencia, Integración propia en esta ronda, Próxima extracción útil, Cambios, Comprobaciones (+4 more)

### Community 98 - "Landing de Pink.ai"
Cohesion: 0.40
Nodes (4): Configuración editable, Landing de Pink.ai, Qué es real y qué no, Videos

### Community 99 - "detect_faces.swift"
Cohesion: 0.60
Nodes (3): Foundation, ImageIO, Vision

### Community 100 - "style"
Cohesion: 0.40
Nodes (5): style, description, enum, minLength, type

### Community 101 - "kind"
Cohesion: 0.40
Nodes (5): description, enum, minLength, type, kind

### Community 102 - "theme"
Cohesion: 0.40
Nodes (5): theme, description, enum, minLength, type

### Community 104 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, framework, installCommand, $schema

### Community 105 - "Revisión del plan Fran → producción"
Cohesion: 0.50
Nodes (3): Revisión del plan Fran → producción, Round 1, Round 2 — APPROVED

### Community 106 - "Integración local — 20 octubre 2026"
Cohesion: 0.50
Nodes (3): Integración local — 20 octubre 2026, Pendiente del mapa original de 24 recursos, Verificación

### Community 108 - "billing.ts"
Cohesion: 0.18
Nodes (25): POST(), runtime, POST(), runtime, POST(), runtime, BillingActions(), Account() (+17 more)

### Community 109 - "text"
Cohesion: 0.50
Nodes (4): text, description, maxLength, type

### Community 110 - "top"
Cohesion: 0.50
Nodes (4): top, description, minimum, type

### Community 128 - "make_style_examples.py"
Cohesion: 0.53
Nodes (3): main(), run(), voice_gain()

### Community 129 - "last_word_id"
Cohesion: 0.50
Nodes (4): description, minLength, type, last_word_id

### Community 130 - "meaning"
Cohesion: 0.50
Nodes (4): description, minLength, type, meaning

### Community 131 - "test_brand_catalog.mjs"
Cohesion: 0.18
Nodes (10): { checkPreferences, DEFAULT_PREFERENCES, applyPreferences, catalog }, load, old, plan, { proposalToPlan }, range, require, root (+2 more)

### Community 133 - "Prueba local con tarjetas e integración de modelos"
Cohesion: 0.18
Nodes (10): Configuración de Anthropic (vía opcional), Corrección tras rechazo del usuario — 19 de octubre de 2026, Entrega, Límites y siguiente prueba, Modo sin clave con Wikimedia — 20 de octubre de 2026, Ollama conectado al editor — 19 de octubre de 2026, Presupuesto de la prueba con Anthropic, Prueba local con tarjetas e integración de modelos (+2 more)

### Community 135 - "test_static_style_samples.mjs"
Cohesion: 0.22
Nodes (8): react-dom, {DEFAULT_PREFERENCES,catalog}, {editorialFamilies}, load, modes, palette, {ResourceSample}, {StaticStyleSample}

### Community 136 - "Recursos visuales: CapCut y Canva"
Cohesion: 0.25
Nodes (7): Contrato de producto recomendado, Evidencia REA efectiva, Incógnitas y siguiente comprobación, Integración posterior del agente principal, Observación de interfaz y límites, Qué se comprobó, Recursos visuales: CapCut y Canva

### Community 139 - "Cuestionario rápido con decisiones ejecutables"
Cohesion: 0.40
Nodes (4): Cuestionario rápido con decisiones ejecutables, Flujo, Menor entrada para Sol, Validación

## Knowledge Gaps
- **5 isolated node(s):** `@anthropic-ai/sdk`, `@types/node`, `@types/react`, `@types/web`, `prettier`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1099 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Correcciones tras la revisión del 11 de octubre de 2026` connect `PinkEdit` to `json`, `cloud.ts`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **What connects `@anthropic-ai/sdk`, `@types/node`, `@types/react` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `validatePlan()` connect `cloud.ts` to `profile.ts`, `jobs.ts`, `PinkEdit`, `candidates.ts`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **Should `contextualProposal.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12807881773399016 - nodes in this community are weakly interconnected._
- **Why does `check_plan()` connect `json` to `PinkEdit`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.07831677381648158 - nodes in this community are weakly interconnected._