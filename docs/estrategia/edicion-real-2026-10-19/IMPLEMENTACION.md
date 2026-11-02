# Prueba local con tarjetas e integración de modelos

El usuario autorizó continuar el 19 de octubre. Este incremento cubre la preparación offline de los hitos 0 y 1 del PLAN aprobado. No implementa aún el ciclo autónomo de subida a MP4 ni memoria de preferencias aprendidas.

## Entrega

Copia aislada `revision-con-tarjetas`, 48,43 s de montaje a 30 fps. Tres tarjetas dirigidas localmente: transformación al hablar de simplificar la edición, recibo al hablar de suscripciones y pregunta al pedir retroalimentación. El modelo todavía no ha propuesto estos elementos. No se han enviado transcripciones, imágenes, audio ni video a proveedores.

El original mantiene sus hashes. La copia usa el mismo source y un matte existente cuya fuente tiene el mismo SHA256. Los intervalos fuente y todas las palabras siguen iguales al montaje original corregido. La versión con tarjetas y el baseline de subtítulos tienen los mismos medios y resolución. Los archivos privados de revisión quedan en work/, fuera de Git.

## Configuración de Anthropic (vía opcional)

- Clave sólo en `motion/.env.local`, variable `ANTHROPIC_API_KEY`; reiniciar el servidor local después de configurarla. No usar `NEXT_PUBLIC_`, ni escribir la clave en documentos o chats.
- `GET /api/jobs/:id/propose` muestra proveedor, modelo y disponibilidad sin llamar a Anthropic. El botón permanece deshabilitado cuando falta configuración, autorización o presupuesto. Disponibilidad no prueba conectividad ni saldo.
- El adaptador conserva Opus 5.5, salida estructurada y effort high. Se fija `https://api.anthropic.com`, timeout 600 s (una propuesta larga puede tardar varios minutos) y cero reintentos automáticos.
- El acceso se limita a pruebas locales. En cloud se rechaza la propuesta hasta disponer de autorización y contabilidad compartidas; el ledger del disco no es una solución multiinstancia.
- `work/_editor-ai/policy.json` es configuración del servidor, no se acepta en el body del navegador. Requiere permiso para el job concreto, transcripción y notas de estilo, ligado además a un SHA256 de su contenido. Si cambia el texto, origen o perfil, el permiso anterior deja de servir. No habilita imágenes, audio o video. No crear permisos para grabaciones existentes hasta contar con autorización explícita para ese envío.

Formato de política para un fixture sintético autorizado (no creada por defecto):

```json
{"version":1,"jobs":{"fixture-sintetico":{"transcript":true,"profile_notes":true,"data_sha256":"SHA256_DEL_CONTENIDO_AUTORIZADO"}}}
```

El diagnóstico GET devuelve `dataFingerprint` calculado en el servidor sobre el montaje y perfil guardados. Sólo después de autorizar esos datos se copia a `data_sha256`. Un borrador con preferencias distintas requiere guardar y revisar de nuevo su autorización; el navegador no puede concederse permisos. El hash excluye tarjetas/cortes existentes para permitir iterar la composición sin autorizar otra vez el mismo texto.

## Presupuesto de la prueba con Anthropic

Cinco llamadas como máximo y US$5 de reserva acumulada. Cada llamada reserva US$1 antes de enviar; request de hasta 64 KB y máximo 16.000 tokens de salida. Tarifas de referencia: US$4/M entrada y US$20/M salida, verificadas en la investigación del 19 de octubre. Es un control conservador de esta integración local; no controla otros consumidores de la cuenta ni sustituye la factura del proveedor.

`work/_editor-ai/usage.json` registra reserva, fecha, job, request ID, tokens y coste estimado, sin prompts ni credenciales. La escritura usa exclusión local y reemplazo atómico. El transporte usa messages.create y registra consumo/request ID antes de validar JSON, rechazo o límite de salida. Una respuesta inválida recibida no se confunde con un timeout de red. La conciliación espera hasta dos segundos por un lock ocupado y antes escribe un recibo independiente por reserva con uso/request ID. Si el lock persiste, conserva ese recibo, devuelve la propuesta y mantiene bloqueadas las llamadas hasta conciliar. Si falla escribir el recibo, todavía se intenta el ledger; si ambos fallan se entrega la propuesta con aviso y se mantiene la reserva. Los errores HTTP también conservan request ID/status cuando el SDK los entrega. Incluso un 401 queda bloqueado conservadoramente; el mensaje lo informa. Una llamada pendiente o de gasto incierto bloquea nuevas llamadas. Un timeout no libera presupuesto. Un ledger corrupto falla cerrado. No borrar el ledger para reintentar: revisar uso en Anthropic y conciliar conservando la historia. Un `usage.lock` dejado por una caída requiere comprobar que no hay operación viva antes de retirarlo manualmente. Sin recuperación automática de locks en este hito.

## Límites y siguiente prueba

Para la vía Anthropic falta la clave y una llamada real con texto sintético para comprobar autenticación, acceso al modelo y JSON. No se ha medido gusto editorial de Claude ni comparación contra Phillipe. La propuesta sigue siendo manual mediante botón y no guarda ni renderiza automáticamente. Para probar con grabaciones hace falta autorizar qué transcripción y notas salen del equipo. El aprendizaje de preferencias y el ciclo completo con versiones candidatas siguen en hitos posteriores.

El guardado con tarjetas y matte ausente ahora falla antes de tocar plan o timeline. Esto no convierte savePlan en una transacción completa: las versiones candidatas y concurrencia de guardado/render pertenecen al hito 2.

## Verificación

- Typecheck de Remotion y Next.
- Suites existentes TS/Python de catálogo y personalización; ocho escenarios Playwright con doubles claramente identificados.
- Veintitrés pruebas nuevas (incluyen cambio de contenido con el mismo ID, lock breve/persistente, recibos, error SDK, exceso de consumo y rutas cloud/sin clave): permiso por job/categoría, tamaño de entrada, reserva concurrente, gasto incierto, ledger corrupto, cupo de llamadas, configuración del SDK y guardado sin matte.
- Next real en puerto 3001: diagnóstico sin clave, botón deshabilitado, cero errores de página. No es prueba de llamada real al proveedor.
- MP4 completo: QC técnico pasa, 1080×1920, H.264/AAC, 30 fps. Audio comparado contra fuente en ventanas de un segundo: desfase cero, correlación mínima 0,9066. No sustituye escucha ni aprobación estética.
- Visión local Apple Vision sobre 99 fotogramas alrededor de las tres tarjetas. Resultados y límites en `work/revision-con-tarjetas/review/`.

El baseline y render editado están en `work/revision-con-tarjetas/out/`. La revisión de calidad no demuestra autonomía editorial ni equivalencia con Phillipe.

## Ollama conectado al editor — 19 de octubre de 2026

La selección de servidor `EDITOR_AI_PROVIDER=ollama` está configurada en `.env.local`. La alternativa explícita es `anthropic`; una selección desconocida falla y no hay fallback entre proveedores. La vía Anthropic conserva sus permisos y presupuesto. No se creó autorización de envío externo para los originales.

`app/_lib/ollamaEditor.ts` usa exclusivamente `http://127.0.0.1:11434` y `qwen3.5:9b-q4_K_M`. GET comprueba `/api/show`, exige formato GGUF y rechaza indicadores de modelo remoto. POST usa `/api/chat`, JSON Schema derivado de Zod, temperatura 0, sin thinking, contexto 8192, salida máxima 2048, timeout 180 s y `keep_alive: 0`. No se envían archivos de video ni audio: se procesa localmente el texto alineado, preferencias y ocupación del borrador. Este control no es una auditoría de toda la red del sistema.

Una exclusión en disco permite una generación local a la vez. `work/_editor-ai/local/` conserva metadatos de llamadas, sin transcripciones ni respuestas; `transport_completed` no equivale a aprobación editorial. Si queda `generation.lock` tras una caída, comprobar que su PID y la generación ya no están activos antes de retirarlo manualmente. No modificar el ledger de Anthropic para recuperar Ollama.

El piloto rechaza requests editoriales de más de 16.000 bytes (mensajes y esquema), en lugar de cortar el texto. Es un límite operativo conservador para clips cortos, no una medición exacta del tokenizer. El modelo se descarga de memoria al finalizar la petición mediante `keep_alive: 0`; la aplicación Ollama debe seguir abierta. No hace falta mantener una conversación en la terminal.

Se comparte el parser y `evaluateProposal` con Anthropic. El prompt ahora incluye tiempos por palabra y prohíbe comparaciones metafóricas. El validador aplica los mínimos ya descritos en el prompt: 0,8 s para cortes, 1,5 s para tarjetas y 2,2 s para fondos. Las tarjetas compare necesitan una señal de comparación explícita; esta comprobación conservadora en español/inglés no sustituye comprensión semántica. Los elementos existentes permanecen intactos.

Prueba real sobre `img-2405` (33,27 s): la primera respuesta tardó 53,49 s y reveló tarjetas breves y una comparación sin fundamento. Después del refuerzo, la segunda tardó 35,22 s; aceptó dos fondos, conservó siete zooms y descartó tres tarjetas (dos por duración, una por densidad). El resultado necesita revisión: conectar el modelo no demuestra calidad equivalente a un editor humano ni autonomía. No se guardaron estas propuestas sobre el plan original ni se exportó otro MP4.

Evidencia privada: `work/ollama-pilot/integration/`. Typecheck pasa; 23 checks de la vía Anthropic, 17 checks nuevos de Ollama y la suite de personalización pasan. Los nuevos checks cubren ausencia de clave externa, preservación, preferencias, cifras, mínimos, comparación, concurrencia, falta de conexión, salida truncada/incorrecta, modelo remoto y origen de la petición.

Uso: abrir `http://localhost:3001/edit/img-2405`, comprobar “Qwen local conectado”, pulsar “Proponer con IA” y revisar el borrador antes de Guardar/Renderizar. Todavía no se genera una propuesta automáticamente al subir un archivo ni se han conectado las 27 recetas de investigación.

Documentación de transporte consultada: https://docs.ollama.com/api/chat y https://docs.ollama.com/capabilities/structured-outputs.

Playwright sobre Next real: GET reconoció Ollama, botón habilitado, click real envió POST al modelo, respuesta 200 aplicada al borrador sin guardar, dos fondos visibles en timeline y reproducción de la vista previa. Cero errores de página; captura `work/ollama-pilot/integration/proposed.png`. Se inspeccionó visualmente la interfaz y una muestra de reproducción; no se revisó cada frame ni se aprobó la estética. `/api/ps` quedó sin modelos cargados después de las pruebas.

## Corrección tras rechazo del usuario — 19 de octubre de 2026

El usuario rechazó la propuesta local: recursos sin sentido, rostro cubierto y ausencia de búsqueda en Pexels. La integración anterior probó transporte y formato, pero no calidad editorial. Las propuestas previas no se consideran aprobadas.

Causas verificadas: BackgroundEffects se dibujaba encima del video sin una máscara de persona; EditorialGraphics heredaba zoom/desenfoque del video; la propuesta asignaba top=300 antes del posicionamiento; la caja head venía de la silueta, no de una detección de rostro; el prompt excluía fotos y PEXELS_API_KEY no estaba configurada.

Cambios:

- `contextualProposal.ts`: resumen del mensaje, frases exactas con anclas calculadas por código y propósito de cada foto. Se restringen las búsquedas a siete acciones fotografiables verificables (edición de video, cámara, micrófono, hoja de cálculo, documentos, teclado y teléfono). Es una primera cobertura acotada, no comprensión editorial general. Si Qwen omite una acción literal, una regla de cláusulas completas puede proponerla; también pasa los controles de preferencias, densidad, posición y visión. No hay generación automática de ondas, diagramas ni tarjetas decorativas en esta vía local.
- Las afirmaciones sobre la app propia, autonomía o personalización piden captura original. Stock no demuestra esas capacidades. El resumen describe lo que dice el video, sin verificar las afirmaciones del creador.
- `stockPhotos.ts`: búsqueda y descarga compartidas con el selector manual. Pexels preferido cuando hay clave; Openverse sólo si se configura explícitamente EDITOR_STOCK_PROVIDER=openverse. Se consultan como máximo dos búsquedas y dos candidatos por búsqueda; cada candidato se inspecciona con Qwen visión local. No se acepta el primer resultado automáticamente. Se guardan procedencia y licencia, y el editor muestra autor y enlace. No se envía el transcript al banco: sólo una consulta del catálogo acotado.
- Sin clave, sin foto pertinente o ante fallo de visión, se muestra el motivo y se conserva la toma. No se reemplaza con decoración. La validación visual del mismo modelo no equivale a aprobación humana.
- `face_safety.py` + Apple Vision: detección real en muestras de 2 fps, unión por toma y márgenes de movimiento/cabello. Para img-2405 se detectaron caras en 66/66 muestras. Se guarda face separada de head y se comparte el timeline con la vista previa y el render. Si no hay medición fiable se ocultan overlays en esa toma. El detector actual requiere macOS; otro worker necesita aportar estas mediciones o implementar su detector antes de habilitar overlays.
- `visualSafety.ts`: zona protegida que contempla las transformaciones de imagen. Las tarjetas quedan fuera del grupo que se amplía con zoom; se evita el rostro, el bloque de captions y los bordes. Los fondos existentes se enmascaran fuera de cara/captions; no es una segmentación completa de persona. La máscara conservadora puede dejar un borde rectangular visible; esta vía ya no propone esos fondos nuevos.

Validación: TypeScript; suites de Anthropic, transporte Ollama, personalización y banco de imágenes; 11 grupos de pruebas contextuales incluyendo citas ambiguas/inventadas, imagen rechazada, clave ausente, preferencias, conservación y 12 encuadres. Pruebas de banco con transporte simulado, sin afirmar acceso real a Pexels. Playwright conserva los ocho escenarios previos. Se generaron seis stills (tres baseline y tres con overlays deliberadamente mal posicionados); Apple Vision encontró caras y la comparación de píxeles comprobó que los tres rectángulos faciales permanecen idénticos tras los efectos. Evidencia privada en `work/ollama-pilot/visual-safety/`. No equivale a revisión de todos los frames ni aprobación estética.

Pendiente: confirmar la clave Pexels configurada por el usuario y ejecutar búsqueda/descarga/selección real de extremo a extremo. No se ha guardado una nueva edición sobre el original ni exportado un MP4 en esta corrección. Todavía falta una evaluación editorial con material nuevo y las recetas avanzadas de la biblioteca.

## Sustitución de Pexels por Pixabay — 19 de octubre de 2026

El usuario reporta que no consigue una API de Pexels. Se investigaron Pixabay y Openverse con documentación primaria. Openverse respondió sin credenciales a «video editing timeline» pero no encontró resultados CC0; otras dos consultas agotaron el timeout. Se elige Pixabay para el siguiente piloto, con clave pendiente. No se afirma que haya una caída global de Pexels u Openverse.

Pixabay se incorpora a búsqueda/descarga compartidas, UI manual, configuración del director, esquema y validación del plan. La selección explícita `EDITOR_STOCK_PROVIDER=pixabay` prevalece sobre claves de otros proveedores. Los archivos conservan procedencia y licencia; las consultas se cachean 24 h en disco, deduplican concurrencia y no se reintentan en masa. Los errores no exponen URLs con la clave. La vía local conserva la revisión visual y protección del rostro. Alcance: fotos; no se ha integrado la API de videos de Pixabay.

Validación: TypeScript, 12 grupos contextuales, nueve checks Ollama, suite Pexels y nueva suite Pixabay con transporte simulado. Pixabay cubre caché persistente/caducidad/concurrencia, búsqueda, descarga, crédito, validación de plan/licencia, origen, cuota y claves ausentes/ocultas. Playwright contra la app real comprueba selector Pixabay, error de configuración correcto y cero errores de página (`work/ollama-pilot/integration/pixabay-ui.png`). GET de estado reconoce Ollama y anuncia que falta PIXABAY_API_KEY.

La clave no estaba presente al verificar. Quedan pendientes la búsqueda y descarga real de Pixabay, revisión visual de los candidatos y aprobación editorial del borrador. No se guardó una nueva edición ni se exportó MP4. Instrucciones actuales: `docs/FOTOS_PEXELS.md`.


## Modo sin clave con Wikimedia — 20 de octubre de 2026

El usuario no consiguió la clave y pidió continuar sin ella. Se activa `EDITOR_STOCK_PROVIDER=wikimedia` y se hace Wikimedia el valor predeterminado del servidor y selector manual. No se eliminan configuraciones ni compatibilidad con los bancos anteriores. Openverse volvió a agotar timeout desde la Mac; Wikimedia respondió.

`commonsPhotos.ts` consulta la API pública, conserva el orden de relevancia, filtra CC0 por metadatos (además de categoría), admite sólo raster en dominios Wikimedia y vuelve a verificar ID/licencia antes de descargar. Autor sin HTML, enlace original y licencia acompañan el archivo local. El esquema y validador del montaje aceptan el nuevo proveedor. Se distingue «sin resultados» de «rechazado por visión». Requiere Internet; no requiere claves. La inserción de B-roll en video sigue fuera de este cambio.

Evidencia real: búsqueda «microphone» con 12 resultados; descarga HTTP 200 de Wikimedia 61688654 e inspección visual positiva como micrófono. No se insertó esa foto ajena al tema de img-2405. La propuesta real para img-2405 buscó la actividad de editar, descargó candidatos y Qwen visión rechazó los logotipos: aceptados 0, conservados 7, bloqueados 4. El resto requiere capturas del producto. No hay aprobación estética ni nuevo montaje guardado. Pruebas y respuestas privadas: `work/ollama-pilot/integration/wikimedia-*`.

Pruebas: TypeScript; nueva suite Commons sin credenciales con licencia cambiada, origen privado, SVG, recurso ausente, cuota, traversal y validación; 14 grupos contextuales incluyen Wikimedia sin claves y búsqueda vacía; regresiones de Pexels, Pixabay y Ollama pasan con transporte simulado. La búsqueda/descarga y la propuesta descritas arriba sí son reales, no mocks.
