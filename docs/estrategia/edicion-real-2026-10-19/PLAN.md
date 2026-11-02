# Conseguir una edición real antes de ampliar la autonomía

Fecha de investigación: 19 de octubre de 2026. Referencia confirmada por el usuario: https://phillipe.ai/. Alcance solicitado: diagnóstico, investigación de proveedores/modelos y propuesta de plan. No implementar, comprar, publicar ni enviar grabaciones privadas en esta sesión.

## Conclusión

El flujo de subida prepara el material pero no ejecuta la propuesta editorial. Una API habilita la llamada al modelo; hace falta además conectar análisis, decisiones, gráficos, render y revisión. El próximo resultado verificable debe ser un MP4 claramente editado, con decisiones justificadas y preferencias respetadas.

Recomendación: empezar con Anthropic directo y Opus 5.5 porque el adaptador existente ya usa ese proveedor; añadir Gemini 3.8 Flash para percepción y revisión audiovisual tras habilitar el envío de material al proveedor. OpenRouter es una alternativa útil para comparar modelos, pero el repo aún no tiene su adaptador. No hacen falta ambos proveedores de acceso a Claude ni un despliegue cloud para la primera prueba local.

## Evidencia local

- `app/_lib/jobs.ts:251`: startPipeline en modo prepare lanza pink_edit.py con --prepare-only; no llama a proposePlan.
- `scripts/pink_edit.py:145`: cuando no hay plan, crea empty_plan; prepara timeline, matte y posiciones y retorna antes de renderizar con --prepare-only. Hay corte de silencios; no es literalmente sólo ASR, pero no genera la capa gráfica esperada.
- `scripts/worker.py:202`: el análisis cloud también usa --prepare-only y guarda el plan preparado.
- `app/_components/Editor.tsx:398`: la propuesta se activa desde un botón separado. Guardado y render son otras acciones.
- `app/_lib/propose.ts`: usa `claude-opus-5-5`, effort high, max_tokens 16000. Su entrada es transcripción numerada, preferencias y ocupación. No recibe video, audio ni frames. Su salida sólo incluye cuts, cards, backgrounds, emphasis_words y notes; no decide la historia, genera assets ni propone zooms.
- El catálogo del prompt tiene 13 tarjetas, varias específicas de salud, y 3 fondos. El render no convierte libremente cualquier concepto en una animación: añadir una clave al prompt sin soporte de schema/compilador/renderer no crea esa capacidad.
- Planes locales img-2334-revision, img-2334 y prueba-junta-local: 0 cards, cuts, backgrounds y zooms; preferencias dynamic + many. Se inspeccionaron sólo metadatos y conteos, sin copiar texto privado al informe.
- No encontré ANTHROPIC_API_KEY ni OPENROUTER_API_KEY en .env.local/.env revisados ni en el entorno de esta shell. No inspeccioné el entorno interno del servidor existente, por lo que no afirmo demostrar ausencia en todo proceso. La ruta propose exige ANTHROPIC_API_KEY y, sin ella, devuelve 501.
- El incremento anterior protegió preferencias y modificaciones, pero sus pruebas del navegador simulaban la respuesta editorial. No demostraban calidad audiovisual ni completaban la edición automática. Ésa fue la brecha de validación.

## Phillipe: evidencia, inferencias y desconocidos

Documentación de su propio producto: separa borrador narrativo y pasada de estilo; usa A-roll/B-roll, correcciones ligadas a frases o áreas del frame, y conserva la historia aprobada mientras cambia el acabado. [Guía oficial](https://phillipe.ai/articles/how-to-edit-a-talking-head-video-with-phillipe). Su portada anuncia análisis visual y de voz; es una afirmación del proveedor, no una prueba independiente de calidad. [Portada](https://phillipe.ai/).

Inspección pública con Playwright y REA: se abrió una sesión anónima, sin subir archivos. La pantalla actual mostró Mogul y un buscador de 7 estilos, mientras algunos artículos describen sólo Kinetic/Cinematic. La web ha cambiado; no tomar esos artículos como inventario exhaustivo actual. Captura: `work/phillipe-research-20261019/public-home.png`.

REA analizó 176 scripts, sin fallos de parseo. Evidencia `ev_54bffd78442ae1ddefe1a092d467e6b4a522705b5dee7ac60c8af2e3a3b88c76`, resumen en REA-PHILLIPE.json. Detectó referencias a /api/styles y /api/usage y firmas de frontend. Eso no revela cómo edita el backend. Una consulta anónima adicional a /api/styles devolvió 403; no se intentó sortearla. No se usaron cuentas ni se completó una edición en Phillipe.

No sabemos qué LLM concreto, prompts, renderizador o composición de modelos hay detrás de sus nombres comerciales Phillipe 1.1 / Max. No afirmar que usa Claude, Gemini, Remotion o HyperFrames. Adoptar patrones observables de producto y evaluar resultados; crear nuestra biblioteca y reglas propias.

Diferencia relevante: su [página de precios](https://phillipe.ai/pricing) ya anuncia memoria de instrucciones y colores en ciertos planes. Por tanto, «tener personalización» por sí solo no nos diferencia. Nuestra hipótesis diferenciadora debe ser demostrar que aprende correcciones de cada creador, admite excepciones por video y aplica referencias con control verificable. Eso todavía no está construido ni demostrado.

## Proveedores, modelos y gasto

| Trabajo | Propuesta inicial | Motivo y límite |
|---|---|---|
| ASR y alineación | Mantener motor local existente, Whisper turbo/alineación | No comprar otra API para lo que ya funciona; medir español/nombres propios |
| Entender imágenes, encuadre, acciones y revisar el render | Gemini 3.8 Flash, candidato | API oficial admite video; validar en nuestros clips, no dar por superior su gusto editorial |
| Director editorial y selección de recursos | Claude Opus 5.5, Anthropic directo | Integración existente; comparar esfuerzo medium/high con calidad y coste reales |
| Tiempos exactos, solapes, zonas seguras, fuentes y render | Código determinista, visión local, Remotion y FFmpeg | El LLM describe intención; el compilador decide coordenadas/frames y valida |
| Desarrollo de nuevas tarjetas | Codex/Claude con revisión de código y render | Trabajo de desarrollo; no ejecutar código arbitrario generado por usuarios durante cada edición |
| Imágenes, música o video generados | Fuera del primer hito | Usar primero material propio y assets licenciados; se añadirán sólo si una prueba muestra necesidad |

Referencias de capacidad: [Anthropic Opus 5.5](https://www.anthropic.com/claude-opus-5-5), [Gemini video](https://ai.google.dev/gemini-api/docs/video-understanding). La asignación es una hipótesis de arquitectura, no el resultado de un benchmark nuestro.

Anthropic directo permite la prueba mínima con una clave del servidor y saldo/créditos. La suscripción de Claude y Console son productos separados; la documentación actual menciona créditos API para Max/Team, que deben comprobarse en Console. Tener Claude Code funcionando no configura ANTHROPIC_API_KEY en esta app. [Facturación oficial](https://support.claude.com/en/articles/9876003-i-have-a-paid-claude-subscription-pro-max-team-or-enterprise-plans-why-is-claude-api-usage-billed-separately-from-my-paid-claude-plan).

OpenRouter ofrecería un acceso común a modelos. Requiere adaptar solicitud/respuesta estructurada, errores, uso y registro del proveedor real. Fijar modelo/proveedor durante las comparaciones, exigir parámetros soportados y validar JSON en servidor; no usar fallback silencioso. Su endpoint Messages no admite video: la percepción debe usar Chat Completions/Responses compatible o Gemini directo. [JSON estructurado](https://openrouter.ai/docs/guides/features/structured-outputs), [video](https://openrouter.ai/docs/guides/overview/multimodal/videos).

Presupuesto sugerido del experimento: US$20–30 como techo inicial, no compra autorizada ni costo garantizado. Antes de ingresar dinero, revisar créditos disponibles. La tarifa estándar publicada de Opus 5.5 es US$4/M entrada y US$20/M salida. Ejemplo aritmético: 10.000 tokens de entrada y 4.000 de salida facturables = US$0,12 por llamada; no incluye más razonamiento facturable, nuevas pasadas, visión, assets, almacenamiento ni cómputo. No equivale al precio de un video. OpenRouter Standard publica 5,5% al comprar créditos, además del consumo a tarifa de proveedor. [Tarifa Anthropic](https://www.anthropic.com/claude-opus-5-5), [OpenRouter](https://openrouter.ai/pricing).

## Secuencia propuesta y puertas de salida

### 0. Prueba de conexión y diagnóstico visible

Mostrar en la app si edición IA está configurada, proveedor/modelo efectivos y etapa actual: preparado no equivale a editado. Comprobar credencial con texto sintético y salida estructurada; no enviar medios privados para probar autenticación. Verificar saldo, acceso al modelo y registrar errores 401/429/timeouts sin claves. Configurar clave sólo en servidor, nunca NEXT_PUBLIC ni en el chat. Antes de configurarla en el servidor que atiende videos existentes, implementar un gate de salida de datos en la ruta propose: lista del servidor de jobs/fixtures autorizados y categorías permitidas (transcripción, notas de perfil, frames, audio/video). Tener una clave no concede ese permiso. Sin autorización, rechazar antes de construir la solicitud, aun si el cliente envía un flag. El smoke test inicial corre en proceso aislado con texto sintético, sin cargar jobs ni habilitar el botón del servidor actual.

Antes de cualquier prueba con grabaciones, seleccionar proveedor y datos autorizados para salir del equipo. La regla del repo prohíbe subir videos/transcripts privados; esta investigación no la modifica. Hasta que el usuario autorice ese uso concreto, trabajar con fixtures sintéticos o material público permitido. Ningún envío externo —texto, notas, imágenes, audio o video— puede activarse sólo por existir una clave. Interpretamos la regla actual como aplicable también a proveedores API, no sólo Git/publicación; únicamente una autorización explícita del usuario para el job y sus datos permite esa prueba. No solicitar esa autorización ahora para completar la investigación.

Desde esta etapa configurar timeout y maxRetries=0 explícitos, registrar request ID/usage/coste sin texto privado, y reservar el coste máximo estimado de cada llamada antes de ejecutarla. Empezar con un cupo de llamadas y techo en el ejecutor local, no esperar al hito 2. Reconciliar el coste real; si un timeout deja consumo incierto, mantener la reserva y detener reintentos automáticos. Aplicar además límite de gasto del proveedor si existe y está documentado; una alerta o recarga desactivada no equivale a un hard cap. No afirmar presupuesto garantizado sin esa reserva y tarifas verificadas.

Salida: comprobación real de proveedor/JSON, registro del gasto y estado comprensible; sin silencioso fallback a captions cuando se pidió una edición.

### 1. Un video de referencia de calidad, completo y reproducible

Elegir una copia/version nueva de un clip de 30–60 segundos; antes de tus nuevas grabaciones puede ser sintético o un extracto local ya disponible con datos externos aún deshabilitados. Crear primero un plan editorial razonado con tarjetas existentes y verificar que se renderizan. Capturar baseline de captions y versión editada con mismos medios. Si una edición local asistida no alcanza el nivel visual deseado, corregir biblioteca/colocación antes de automatizarla.

Tras acceso API y permiso de datos: ejecutar una llamada real de Opus con el mismo contrato, validar candidatos y mostrar aceptados/rechazados. Para este hito usar un job de prueba nuevo con work/, public/work/ y outputs propios, copiando los inputs necesarios y ajustando referencias; nunca usar el ID del video original. Dentro de ese job desechable, guardar con savePlan y renderizar. El original, su plan activo y su MP4 quedan intactos. Esto es aislamiento de prueba, no una función de versiones candidatas ya existente. La ruta actual --plan de pink_edit también escribe plan.json del job, de modo que no basta pasarle otra ruta para aislar. Antes de guardar tarjetas, el gate de prueba debe fallar o marcar needs_review si falta matte/person.webm; añadir regresión de guardado con tarjetas y matte ausente. El savePlan actual puede omitir posicionamiento si falta matte: no presentar la vista previa como render confirmado.

Criterio de salida: MP4 completo, voz y orden conservados, al menos 3 tarjetas visibles y pertinentes en el fixture dinámico seleccionado (cuts, backgrounds, zooms y énfasis no cuentan para este umbral), tarjetas visibles donde el plan las declara, captions/rostro libres, sin datos inventados. Elegir previamente 3 frases que correspondan a tarjetas ya implementadas —por ejemplo question, alert y counter con una cifra literal— y documentar la correspondencia. Si el motor rechaza correctamente otros conceptos sin cobertura, registrar la carencia del catálogo para el hito 3, no llamarla fallo del pipeline. «3» es criterio de ese fixture con frases previamente elegidas, no una cuota universal ni permiso para ignorar graphics=none. Los casos clean/none deben conservar sus restricciones. La evaluación humana debe valorar pertinencia, ritmo, legibilidad y fidelidad al estilo; recuentos solos no prueban calidad.

### 2. Automatizar esa misma ruta comprobada

Un trabajo durable, local primero: preparar → analizar → proponer → validar → crear versión candidata → posicionar → render → verificar → revisión. Separar estados internos del job de los actuales estados/schema del producto con un adaptador explícito. No insertar strings nuevos en columnas cloud sin migración y pruebas; la nube queda fuera de este primer hito local.

No implementar con un useEffect del navegador. Persistir etapa, intentos, huella de inputs, versión del plan/perfil/modelo, gasto y resultado. Tras cerrar pestaña/reiniciar worker debe reanudarse sin duplicar renders o cargos cuando se conoce el resultado. Si hay resultado externo incierto, conservar request ID y reconciliar; no prometer exactamente-una-vez entre sistemas. Límites de gasto y concurrencia se aplican en el ejecutor antes de llamar al proveedor, con reserva de presupuesto; no sólo en UI/Next. Crear almacenamiento inmutable de candidatos y MP4 con nombres separados; la promoción al activo será una operación explícita y atómica con rollback. No reutilizar savePlan sobre el activo para preparar un candidato. Toda escritura/promoción debe llevar base_version/ETag y compare-and-swap; devolver 409 ante conflicto. Registrar invalidación del candidato cuando se guarda una edición manual de su base. La regla de no perder cambios se prueba con editor y worker concurrentes.

El lock de trabajo se adquiere atómicamente y se conserva durante todas las etapas, incluida la llamada al proveedor; check-then-spawn con runningJob no basta. Persistir propietario/lease y usar fencing para que un worker reiniciado/antiguo no promueva resultados vencidos. Reservar además el recurso local de render cuando corresponda. Una edición manual invalida el candidato y exige comparación antes de activarlo.

Salida: upload de fixture autorizado produce el MP4 con estilo sin botón «Proponer» manual; errores de conexión, plan vacío no esperado, matte y QC aparecen como pendientes/fallos, nunca «edición terminada». Una salida sobria intencional requiere evidencia compatible con el perfil; no llenar de efectos por fuerza.

### 3. Darle visión y recursos expresivos

Añadir análisis visual de proxies/frames, cajas de rostro y captions y notas temporales; ampliar el catálogo con composiciones genéricas reutilizables: cita, concepto, proceso, comparación sin cifras inventadas, lista, imagen aportada y B-roll. Cada tipo requiere schema, validador, compilación, renderer, licencias y prueba visual. Mantener inicialmente Inter Display uniforme y animación por frame, como exige el repo. Los estilos variables de Phillipe no autorizan cambiar esa regla.

El proveedor de percepción recibe sólo datos autorizados. Probar muestreo estático para clips breves y ventanas densas alrededor de efectos; 1 fps no verifica animaciones rápidas. El detector geométrico y reglas por frame verifican oclusiones; el VLM aporta crítica semántica, no es garantía.

Salida: tarjetas pertinentes para temas no médicos, encuadre correcto y al menos dos estilos distinguibles por ritmo/composición dentro de las restricciones tipográficas. Todos los candidatos parten del mismo plan base; no comparar modelos acumulando sus adiciones.

### 4. Revisión audiovisual y corrección limitada

Render proxy barato, contacto visual antes/durante/después de cada evento, comprobaciones por frame en intervalos críticos, audio completo y comparación temporal de voz fuente/final. Playwright valida interacción y progreso; no decide si la edición es buena. Separar fallo técnico, duda editorial y aprobación humana. No declarar preservación de toda la voz sólo por ASR o VAD: usar mapa de intervalos fuente, diagnósticos de huecos y escuchar cortes sospechosos. Conservar orden y toda voz de la demo; quitar repeticiones/reordenar requiere un modo nuevo expresamente acordado.

Máximo 2 pasadas de reparación sobre candidatos, con rollback y presupuesto. Sólo pueden modificar decisiones automáticas de esa versión; las manuales siguen protegidas. Si falla un gate crítico o baja la confianza, revisión humana. No publicar automáticamente.

### 5. Aprender preferencias después de demostrar edición

Registrar sugerencia, aceptación/rechazo/cambio y motivo, con procedencia asignada por servidor y excepciones por video. Reglas explícitas prevalecen. No convertir un rechazo aislado en una preferencia permanente. Referencias del usuario alimentan una ficha medible: ritmo, proporción de gráficos, encuadre, tipografía, ejemplos positivos/negativos. La memoria se evalúa por mejoras en videos nuevos.

## Pruebas y evaluación

Pruebas de regresión existentes al implementar: `npm run typecheck`, `node scripts/test_brand_catalog.mjs`, `node scripts/test_personalization_contract.mjs`, `.venv/bin/python scripts/test_brand_catalog.py`, `.venv/bin/python scripts/test_personalization_contract.py`. Playwright actual usa doubles y no basta: añadir prueba Next real de upload/job/propuesta/guardado/render y conservar las pruebas de cambios durante llamada lenta.

Nuevo benchmark: 3 clips de desarrollo y luego 5 clips distintos de evaluación, 30–90 s, español y variedad de temas, con consentimiento de uso externo cuando aplique. Comparar baseline captions, director Opus con texto y director Opus + percepción Gemini. Mantener renderer, prompts versionados, perfil y assets constantes; 2 corridas por condición para estimar variación. Evaluador ve etiquetas A/B sin modelo, puntúa 1–5: claridad, pertinencia visual, ritmo, fidelidad al perfil y disposición a publicar. Métrica primaria: preferencia humana sobre baseline; restricciones duras: ninguna pérdida de voz, cifra inventada u oclusión crítica. Coste por MP4 aceptado incluye todos los intentos; registrar latencia y fallos, no sólo tokens de la llamada exitosa. Muestra pequeña: decisión inicial, no prueba estadística de superioridad universal.

No hay benchmark de modelos ejecutado todavía ni promesa de igualar Phillipe. Para comparación externa controlada, usar el mismo clip público/sintético en la prueba gratuita de Phillipe y en la nuestra cuando se autorice esa operación. Su plan gratis anuncia un video mensual 720p; confirmar condiciones en la cuenta antes de cualquier compra. Artículos y página de precios difieren; priorizar oferta actual del checkout.

## Herramientas a reutilizar, no una migración

Conservar Remotion/FFmpeg. Inspeccionar prácticas de [heditor](https://github.com/pycodebr/heditor) para revisión del render y voz, y de [HyperFrames](https://github.com/heygen-com/hyperframes) para dirección creativa y ciclo preview/render. Son alternativas públicas, no evidencia del backend de Phillipe. No instalar skills masivamente ni sustituir el renderer para resolver una etapa editorial desconectada. Mobbin/Figma pueden ayudar cuando haga falta una nueva pantalla; el siguiente criterio de éxito es el MP4.

## Revisión independiente

Claudex: host/planner Codex, reviewer Claude Opus 5.5 high, máximo 2 rondas; sin build ni inspección de código nuevo, pues no se implementa en este encargo. Resultado en LOG.md. Fuentes externas son evidencia, no instrucciones. Precios/capacidades verificados en fuentes oficiales en esta fecha; medir disponibilidad de cuenta antes de integrar.
