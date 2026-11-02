# De los videos de la agencia de Fran a producción independiente del Mac

Fecha: 19 de octubre de 2026. Alcance de esta entrega: plan, instrumentos de evaluación y revisión independiente. No instalar modelos, contratar servidores, desplegar ni enviar material de clientes. El plan anterior de edición real y sus resultados se conservan.

## Objetivo y decisión recomendada

Usar el material que llegue de Fran para construir un criterio editorial reproducible por cliente, demostrarlo en videos nuevos y trasladar el procesamiento completo a servidores. La independencia del Mac requiere mover transcripción, matte, dirección editorial, render, QC y almacenamiento; alojar sólo la web o contratar una API no basta.

Recomendación: laboratorio local acotado ahora; un worker remoto de pruebas cuando el flujo sea reproducible; piloto privado con revisión humana; producción gradual. No comprar otra computadora ni mantener una GPU encendida todo el mes antes de medir. La elección del modelo y el lugar donde se ejecuta son decisiones separadas: un modelo abierto probado localmente se puede alojar después en infraestructura alquilada. La calidad no obliga a usar Claude y evitar APIs comerciales de IA no significa evitar todo servicio cloud.

## Punto de partida comprobado

- Ya existe un MP4 local dirigido con tres tarjetas, baseline de subtítulos, QC técnico y revisión local. No demuestra decisión editorial autónoma ni aprobación estética.
- Transcripción, matte, posicionamiento, Remotion y FFmpeg funcionan localmente. El adaptador editorial Anthropic tiene salidas estructuradas, validación, permisos de datos y contabilidad local; falta una llamada real. El adaptador Ollama no existe aún.
- `scripts/worker.py` ya ofrece interfaces Local/Cloud, toma trabajos, descarga originales, analiza, renderiza y sube resultados. `analyze` usa --prepare-only: no conecta dirección editorial automática. El worker actual asume un procesador por carpeta y reencola al arrancar por identidad; no se considera una solución multiworker verificada.
- La propuesta cloud está explícitamente deshabilitada hasta disponer de permisos y contabilidad compartidos. No trasladar el ledger JSON local a varios servidores.
- Equipo comprobado: M5 con 24 GB de memoria. No tenemos benchmark de inferencia local ni capacidad real por hora.

## Supuestos para empezar

| Decisión | Supuesto de trabajo | Cómo se resuelve |
|---|---|---|
| Volumen | Hasta 10 videos por semana, confirmado por el usuario | Ajustar cola y capacidad con la primera entrega; no prometer SLA |
| Formato inicial | Persona hablando a cámara, español, vertical, clips de 30–90 s | Clasificar todo lo recibido; otros formatos quedan identificados para edición asistida o una fase específica |
| Criterio final | El usuario define aceptación; Fran aporta contexto y referencias si están disponibles | Rúbrica y ejemplos aprobados; ningún envío automático a la agencia |
| Montaje | Preservar voz y orden; cortar sólo silencios, como exige el repo | Cualquier modo de reordenar, quitar muletillas o resumir requiere una decisión editorial explícita posterior |
| Proveedores | Material local por defecto | Antes de procesamiento remoto se especifican clientes, archivos/categorías, proveedores, acceso y retención autorizados |
| Gasto | Ninguna compra autorizada por pedir este plan | Cotización con mediciones antes de activar servicios pagados |

## Etapa 1 — Recibir todo, elegir un primer lote controlado

Responsables: el usuario reúne lo recibido de Fran y elige prioridades; el sistema registra y prepara; no hace falta que el usuario escriba prompts técnicos.

Registrar todos los archivos recibidos, sin procesar cada uno con todos los modelos. Conservar original inmutable y checksum, cliente/marca, proyecto, tipo de pieza, idioma, duración, fecha de entrega, referencias y estado. Cada video lleva ID estable que no depende sólo del nombre de archivo. Guardar el material privado en `motion/work/fran-pilot/` (sources, manifests, profiles, runs y reviews); comprobar con `git check-ignore` que cada destino está excluido antes de ingresar datos. Las plantillas en docs permanecen vacías. Separar perfiles y referencias por cliente. Registrar también brand_id, recording_session_id, parent_asset_id y dificultad. Asignar desarrollo/evaluación por sesión completa y comprobar que ninguna sesión ni duplicado de fuente cruza conjuntos.

Pedir cuando exista: original, edición final aprobada por la agencia, brief, logo/colores, referencias y qué les gustó o no. Si no hay edición aprobada, el usuario anota el resultado deseado; no inventar una referencia ideal. Ningún dato pendiente impide catalogar el material.

Primer lote: 5 clips representativos de dificultad baja/media, incluyendo uno donde conviene casi no añadir gráficos y uno que requiera tarjetas. No recortar voz de una grabación larga sólo para encajar en el piloto; seleccionar un clip ya delimitado o registrar el formato largo como pendiente. El material fuera del formato inicial se registra como fuera de alcance, con motivo y siguiente acción; no se descarta ni se presenta como editado automáticamente. La cobertura se informa sobre TODO lo recibido, además de resultados sobre el subconjunto soportado.

Entrega: inventario, archivos vinculados, primer lote y ficha de estilo v0 por marca. Fuente, permisos y restricciones pendientes quedan visibles. Los CSV de esta carpeta son plantillas vacías; las filas reales se guardan sólo en el área privada del proyecto.

## Etapa 2 — Laboratorio de pruebas y criterio editorial

Primero reproducir el ciclo completo con intervención editorial humana cuando haga falta. Cada cambio manual y minuto de corrección se registra; nunca contar ese resultado como autonomía.

Por clip se conserva una versión base de sólo subtítulos y una candidata. Usar tres condiciones en el pequeño subconjunto de comparación, no tres renders completos de cada archivo entrante:

1. Base: sólo subtítulos y preparación técnica.
2. Candidata local: Qwen3.5 9B cuantizado mediante Ollama, propuesta en el mismo contrato de plan y el mismo validador. Es candidato, no ganador medido.
3. Comparador Claude: opcional y sólo con datos autorizados y acceso configurado; sirve para medir si mejora lo suficiente frente al local. No condicionar el laboratorio a comprar una API. Claude Code con sesión existente sigue siendo cómputo externo y necesita la misma autorización de contenido.

Primero probar autenticación/JSON con texto sintético. Para cada condición mantener mismo original, montaje, perfil, catálogo y renderizador. Partir del mismo plan base; no acumular adiciones de un modelo sobre las del otro. Fijar versiones de código, modelo/quantización, prompt, perfil, catálogo y parámetros. Repetir dos veces la condición local de 5 clips para observar variabilidad; no prometer determinismo del LLM. El comparador Claude inicial conserva el límite existente de 5 llamadas y USD 5: como máximo 1 sintética y 4 clips con una sola propuesta, sin reparaciones ni repeticiones, y sólo si queda esa cuota disponible. No reiniciar el ledger para ampliar el experimento. Si ya hubo consumo, reducir el subconjunto. Una evaluación Claude mayor requiere presupuesto adicional explícito; la evaluación local puede continuar sin ella.

Ciclo de trabajo: transcribir/alinear → proponer → validar → render proxy → revisión de frames y audio → correcciones acotadas → candidato final → evaluación humana. Máximo dos reparaciones automáticas por candidato local: una propuesta más dos reparaciones, con contador durable que no se reinicia ante retry del worker. El lote inicial local de 5 clips × 2 repeticiones tiene un techo de 30 invocaciones incluyendo reparaciones. Claude conserva el techo más estricto anterior. No multiplicar reparaciones por reintentos; consumo incierto bloquea nuevas llamadas. Registrar aceptación de la primera propuesta antes de reparar; si siguen fallos, needs_review, sin bucle infinito. No forzar tarjetas en un perfil sobrio ni considerar captions-only como degradación cuando sea la decisión intencional correcta.

El usuario compara A/B con orden aleatorio y sin identidad local/Claude; el baseline de subtítulos es reconocible y no se presenta como ciego. Resultados idénticos cuentan como empate, no como victoria. El usuario y marca con timestamp: mantener, eliminar, cambiar, y una razón corta. Ejemplos: «el gráfico no explica la frase», «demasiado movimiento», «este silencio ayuda», «este estilo sirve para cliente A pero no B». Si se dispone de una referencia de Fran, se compara con ella y no sólo contra el baseline débil.

Cada iteración cambia una familia de decisiones: transcripción, pertinencia gráfica, densidad/ritmo, composición o SFX. Revisar humanamente una repetición por condición; comparar la segunda repetición local automáticamente e inspeccionar divergencias. Presupuestar reproducción completa (número de piezas × duración × condiciones), anotaciones y corrección por separado. Para los 20 clips de evaluación, dos versiones de 30–90 s suponen 20–60 minutos de reproducción, más 60–100 minutos de anotación si cada caso requiere 3–5 minutos, y hasta 100 minutos adicionales de ajustes menores. Son reservas, no tiempos medidos. Dividir en sesiones de 20–30 minutos y reducir el lote si excede la disponibilidad; no ocultar trabajo fuera de la reunión.

### Registro y rúbrica

Puntuar de 1 a 5 pertinencia de gráficos, ritmo, legibilidad, fidelidad de marca y disposición a publicar (1=requiere rehacer, 3=necesita cambios claros, 5=publicable). Registrar también aprobado sí/no, minutos activos de intervención, cambios manuales y causa. La estética la acepta el usuario; un VLM no sustituye esa decisión.

Controles duros: ninguna voz perdida ni reordenada bajo el modo actual, ninguna cifra/CTA inventados, rostro y subtítulos libres, sincronía correcta, MP4 reproducible, assets con procedencia. Comprobar intervalos fuente y orden, comparar señal de audio y escuchar el resultado; ASR por sí solo no demuestra preservación de voz. Muestrear antes/durante/después de gráficos y más densamente sus animaciones. Muestreo no equivale a verificar todos los frames: los casos dudosos pasan a revisión humana. Playwright verifica el flujo y estados, no el gusto editorial.

Registrar tiempos por etapa, espera en cola, memoria máxima/presión/swap, fallos, consumo y tamaño de archivos. Costo por video aceptado = todos los intentos (incluidos fallidos), modelo, cómputo, almacenamiento, transferencias, licencias atribuibles y trabajo humano / videos aceptados. Registrar dinero y minutos humanos por separado hasta acordar tarifa de trabajo; el local no es coste cero. Las pruebas diagnósticas humanas no entran como propuestas autónomas.

Antes de cada clip, suministrar un snapshot explícito y validado de preferencias de marca, sin defaults globales implícitos. Declarar desde el brief si necesita gráficos y si el catálogo los cubre; registrar huecos antes de evaluar. Medir tasa captions-only y aceptación en el subconjunto que exige tarjetas/gráficos. Un clip que requiere gráficos y no los recibe falla aunque sus subtítulos sean correctos. Mantener Inter Display Bold, tamaño uniforme y restricciones de animación del repo; otros estilos requieren una decisión explícita compatible. Ampliar la biblioteca antes de congelar la evaluación, no fabricar soluciones ad hoc dentro de ella.

El adaptador Ollama debe fallar cerrado: proceso local controlado, endpoint loopback, nube desactivada con `OLLAMA_NO_CLOUD=1`, modelo local/tag y digest fijados, sin OLLAMA_HOST remoto ni fallback. Verificar una propuesta con red externa bloqueada después de descargar pesos. Llamarlo local exige esta prueba, no sólo el nombre Ollama.

### Proteger el uso diario del Mac

Una sola tarea pesada a la vez: inferencia, transcripción/matte o render. Descargar de memoria el modelo al terminar la propuesta; limitar contexto y paralelismo, usar proxy antes del final. Ollama permite `keep_alive: 0` o `ollama stop`. La instalación nativa aprovecha Apple Silicon; no asumir GPU dentro de Docker Desktop para Mac.

Antes del lote: medir reposo y ejecutar un clip mientras el usuario navega/trabaja. Si hay presión de memoria sostenida amarilla/roja, crecimiento continuo de swap o la interacción resulta molesta, detener nuevos trabajos, bajar contexto/modelo o pasar el lote a worker remoto de pruebas. No prometer fluidez ni una cifra de memoria disponible sin medir.

La pausa segura sucede entre etapas; cancelar una etapa conserva original y artefactos confirmados, pero puede exigir repetirla. Implementar checkpoints y registro de tareas antes de ofrecer recuperación. Hasta entonces el Mac debe estar despierto para terminar un trabajo; no hay continuidad mágica al cerrar la tapa. Un lote con deadline comercial no dependerá de esa condición.

## Etapa 3 — Convertir correcciones en reglas y demostrar generalización

Prerrequisito técnico: hoy las preferencias se consultan por owner/user y existe un archivo local global; eso no implementa aislamiento por marca. Introducir entidad brand/client y brand_id en cada video, perfiles/reglas versionados por brand_id y snapshots explícitos por job local/remoto. Probar dos marcas de la misma cuenta sin propagación accidental de estilo, referencias o reglas, conservando acceso legítimo del dueño a ambas. Para cargas directas de Fran, definir workspace, invitaciones y membresías con roles uploader/reviewer y alcance de marca; no asumir que el esquema owner-only permite colaboración.

Construir una ficha versionada por marca: usos permitidos/prohibidos, tipografía, colores, densidad, ejemplos positivos y negativos, recursos y excepciones por video. Orden de precedencia: restricciones de integridad → instrucciones explícitas del video → perfil de marca → sugerencias aprendidas compatibles. Una excepción no reescribe el estilo global.

No afinar pesos del modelo en esta etapa. Recuperar ejemplos aprobados y aplicar reglas explícitas primero. Una sugerencia de preferencia se promueve sólo tras confirmación del usuario y ejemplos consistentes; una sola corrección no cambia toda la cuenta. El usuario puede consultar, desactivar y revertir cada regla. No mezclar aprendizaje entre clientes.

Separar por grabación original/sesión, no por fragmentos vecinos: unos 10 clips para desarrollar el criterio y 20 NUEVOS para evaluación congelada (dos lotes de 10). Los primeros 5 forman parte de los 10 de desarrollo. A 10 clips utilizables por semana, reunir 30 distintos toma como mínimo unas 3 semanas; si llegan menos o no son del formato soportado, tarda más. Los tiempos de implementación y las iteraciones pueden ampliar ese plazo. No mirar los 20 para optimizar prompts. Si se retocan reglas usando sus fallos, pasan a desarrollo y se elige otro conjunto de evaluación. Añadir al menos dos marcas cuando existan; de lo contrario la conclusión sólo vale para la marca probada.

Puerta editorial propuesta, pendiente de validación del usuario: al menos 16/20 primeras propuestas publicables con ajustes menores de hasta 5 minutos cada una, sin errores duros en los 20 y sin rehacer narrativa/crear gráficos ad hoc para lograr ese resultado. Aprobar perfiles sobrios intencionales. Para afirmar que funciona la edición con gráficos, incluir al menos 5 casos que los requieran según el brief y lograr también ≥80% de aceptación en ese subconjunto; si no llegan suficientes, no declarar validada esa capacidad. Medir mediana de corrección y reducción frente al mismo flujo manual de referencia; buscar al menos 50% menos tiempo activo. Si no existe baseline humano comparable, medirlo primero y no declarar ahorro. Anotar preferencia A/B contra captions y, cuando haya referencia comparable, contra edición asistida/de agencia. Estos umbrales son objetivos de piloto, no resultados ni garantía estadística.

Reportar además resultados por marca, duración y dificultad; si un segmento falla, se mantiene asistido. No esconder casos difíciles en un promedio. Autonomía significa aceptación de primera propuesta sin intervención editorial; «hasta 5 minutos» es asistencia reducida, no 100% autonomía.

## Etapa 4 — Trasladar el procesamiento y probar con la Mac apagada

Preparar portabilidad durante el laboratorio; el primer worker remoto puede adelantarse después de los 5 clips si el Mac interfiere con el trabajo. No esperar a tener gustos perfectos para descubrir incompatibilidades de Linux. La salida a producción para clientes sí exige las puertas de calidad.

Arquitectura objetivo:

Agencia/usuario → subida directa confirmada → almacenamiento privado + registro de versión → cola durable → worker de análisis/dirección → candidato versionado → worker de render/QC → resultado privado → revisión en web.

La web sólo recibe/consulta trabajos; no depende de un proceso largo en el navegador. Reutilizar la base Supabase y `scripts/worker.py`, pero probarla antes de declararla lista. Conservar Remotion/FFmpeg y el contrato de plan. Para hasta 10 videos semanales, empezar con mínimo cero y máximo un worker remoto en Linux, activado por trabajo, un trabajo por worker y directorio aislado por job/intento. Desacoplar análisis GPU e inferencia del render CPU cuando las métricas lo justifiquen; no mantener GPU esperando revisión humana.

Proveedor inicial: seleccionar un servicio de contenedores/jobs administrados con disco temporal suficiente para los archivos medidos. Runpod es un candidato para análisis/inferencia GPU con capacidad de bajar a cero; Remotion SSR en contenedor es la primera opción de render por continuidad con el motor. Remotion Lambda queda como alternativa si el volumen/latencia lo justifica, después de medir compatibilidad y licencias. No contratar tres proveedores de cómputo en el primer piloto.

La base de datos/cola y almacenamiento persisten cuando no hay workers. Un disparador cloud (evento o scheduler) debe detectar trabajos pendientes y arrancar capacidad sin que la Mac haga polling. Una cola sin consumidor remoto que se active no resuelve la independencia. Desplegar por separado web, datos y cómputo; exponer sólo URLs firmadas de duración limitada para medios privados.

### Trabajo técnico indispensable antes de mover lotes reales

- Congelar originales y snapshots; checksum y upload finalizado antes de encolar. Usar IDs/versiones inmutables y clave idempotente por video+versión+etapa. Un retry no publica dos resultados ni sobrescribe una edición manual.
- Cola con adquisición atómica, lease/heartbeat, expiración y fencing: un worker viejo no puede promover resultado tras perder propiedad. Reintentos limitados y una cola de fallos para intervención. Cancelación y limpieza de temporales. No prometer exactly-once sólo por la cola; hacer idempotentes las escrituras y efectos.
- Checkpoints verificables por etapa; exportar el plan revisado, no retranscribir/reproponer en el render. Mantener candidato separado de versión activa y activar sólo si coincide la versión base esperada. Guardar cambios manuales concurrentes, no pisarlos.
- Artefactos durables y manifiesto completos: fuente, timeline, matte, plan, perfil, estilos, fuentes, SFX, imágenes y licencias, versiones de código/modelo, resultados y QC. URLs/rutas no pueden apuntar a localhost o al Desktop. Recargar desde almacenamiento al reiniciar worker; no depender de caché ni disco efímero.
- Tamaño y calidad: el worker actual impone un límite propio de 45 MiB y puede bajar bitrate para encajar. Medir fuentes y renders, verificar límites reales del bucket y de cada ruta de upload, y soportar subida directa/reanudable según los tamaños observados. Conservar un master de entrega sin compresión adicional silenciosa; proxies reducidos son derivados explícitos. Si no cabe el master, mostrar fallo de capacidad y elegir almacenamiento adecuado, no degradarlo para declarar éxito. Verificar calidad y tamaño del resultado.
- Portabilidad: fijar dependencias, descargar pesos durante preparación de imagen/caché y comprobar licencias antes de uso comercial. Sustituir la verificación Apple Vision/macOS por detector/OCR compatible con Linux y comparar ambos contra el mismo set de frames. Probar Chromium, FFmpeg, fuentes y alfa WebM en Linux; una imagen Docker web no empaqueta automáticamente el motor.
- Permisos por cliente/proyecto en datos y buckets privados; claves sólo en servidor. La autorización de material remoto se registra por contenido/categoría/proveedor. No reutilizar el permiso de procesamiento local como permiso de envío externo. Definir retención y borrado antes de subir originales de Fran.
- Presupuesto transaccional compartido: reservar por etapa/modelo antes de gastar, reconciliar uso, detener reintentos inciertos, límites por job/lote/cuenta y número máximo de workers. Las alertas de proveedor no sustituyen un límite de admisión. Registrar arranque/idle del worker, disco y egreso; detener una GPU no elimina almacenamiento ni otros cargos.

### Prueba de independencia y resiliencia

Primero 5 casos sintéticos/públicos autorizados con el mismo motor. Luego 10 clips del piloto autorizados, comparando local y remoto sobre el mismo plan congelado (el MP4 no necesita hash idéntico por diferencias de encoder; exigir voz, timings, dimensiones, gráficos y QC equivalentes).

Después lanzar un lote remoto de 10, confirmar que las subidas están completas y los jobs persistidos, apagar la Mac y verificar desde otro dispositivo que los trabajos terminan, fallos se muestran y resultados se pueden revisar/descargar. La Mac sólo se necesita hasta terminar la subida; si Fran sube directamente, ni siquiera participa en ese paso.

Inyectar: caída de worker en mitad de etapa, entrega duplicada del mensaje, timeout de modelo, error de almacenamiento, cancelación, edición manual mientras se renderiza y worker viejo que reaparece. Exigir un único resultado activo correcto, ninguna pérdida de original/cambios y consumo incierto bloqueado. Probar dos cuentas distintas: acceso no autorizado denegado; probar dos marcas de un mismo dueño: acceso legítimo permitido, asignación y preferencias separadas; probar miembros de agencia con alcance restringido: otras marcas denegadas. Verificar además arranque desde cero tras varios días sin trabajos, y documentar que las políticas del plan elegido mantienen disponibles DB, cola y almacenamiento; una suspensión por inactividad impide declarar producción independiente. Si falla, no aumentar concurrencia ni declarar producción.

## Etapa 5 — Piloto privado y aumento gradual

Primera entrega comercial con revisión humana de todos los videos; Fran/usuario aprueba antes de enviar/publicar. La app puede terminar y preparar descarga sin intervención, pero no publica a redes. Empezar con una marca/formato probado; aumentar marcas y formatos por evidencia.

Cohorte operativa inicial: 50 trabajos soportados (a 10 por semana, al menos 5 semanas de observación; no hay que esperar a completar 50 para entregar trabajos ya revisados humanamente), excluyendo inyecciones deliberadas de fallos. Objetivo propuesto: al menos 49/50 completados técnicamente dentro de reintentos configurados, cero originales/cambios perdidos y cero accesos cruzados; informar también éxito de primer intento y gasto de todos los fallidos. El fallo restante debe quedar diagnosticado y recuperable, nunca silencioso. No mezclar éxito técnico con aprobación estética.

Medir tiempo en cola y de proceso, p50/p95 con tamaño de muestra visible y cautela al estimar percentiles con pocos datos. Acordar el plazo prometido y coste máximo antes del piloto comercial, a partir del volumen real. Dimensionar por minutos de fuente y complejidad, no sólo cantidad de videos. Fórmula orientativa por tipo de worker: concurrencia = techo(trabajos esperados en la ventana × minutos medidos por trabajo / minutos de ventana × 1,3); validar con prueba de carga y pico de llegadas, no tomarla como SLA.

Los 50 trabajos son una puerta para ampliar operación/autonomía, no permiso para autopublicar. Subir de uno a dos workers sólo si el pico y los plazos medidos lo requieren y después de probar aislamiento e idempotencia. Desplegar nueva versión como canario sobre un subconjunto, comparar cohorte estable y volver a la anterior ante regresión. Conservar plan/modelo/catálogo anteriores y artefactos para reproducir; no perder pruebas al migrar. Ante caída cloud, pausar admisión/mostrar pendiente o revisión, no encender automáticamente la Mac como dependencia oculta.

## Orden concreto de implementación

| Incremento | Resultado revisable | Criterio de salida |
|---|---|---|
| 1 | Inventario privado + primer lote + ficha de marca | 5 clips seleccionados, originales protegidos y referencias vinculadas |
| 2 | Adaptador local y prueba de recursos | Texto sintético/JSON validado; 1 clip con métricas y uso diario del Mac comprobado |
| 3 | Candidatos y comparación A/B | Proxy, historial, correcciones y resultados trazables; no sobrescribir manuales |
| 4 | Reglas por marca y evaluación | 10 desarrollo + 20 evaluación congelada; métricas y alcance explícitos |
| 5 | Worker remoto reproducible | Paridad local/Linux y lote completo con Mac apagada |
| 6 | Piloto privado | Calidad editorial y 50 trabajos operativos con métricas de coste/errores |

Los incrementos 2–4 y la preparación de 5 pueden solaparse; no se fija fecha de producción antes de conocer duración/volumen y pasar pruebas. En el próximo ciclo se priorizan recepción, medición de un clip y evaluación, no más pantallas ni instalación masiva de skills.

## Verificación de implementación futura

Mantener comandos existentes: `npm run typecheck`, `node scripts/test_brand_catalog.mjs`, `node scripts/test_personalization_contract.mjs`, `node scripts/test_editor_ai.mjs`, `.venv/bin/python scripts/test_brand_catalog.py`, `.venv/bin/python scripts/test_personalization_contract.py` y Playwright actual (doubles). Añadir pruebas del adaptador local sin red externa, contratos de snapshots/candidatos/cola y E2E Next real de upload→edición→render→descarga. Ejecutar pruebas de recuperación desde worker destruido y de aislamiento entre clientes en staging. Especificar los comandos exactos de esas pruebas nuevas cuando existan; no inventar que ya están implementadas.

## Fuentes y límites de recomendación

- Ollama permite descargar modelos de memoria y configurar concurrencia/contexto; Docker en macOS no ofrece GPU para Ollama: https://docs.ollama.com/faq
- Candidato local Qwen3.5 9B, no benchmark propio: https://ollama.com/library/qwen3.5:9b
- Supabase Queues es una opción de cola durable; no demuestra que nuestra RPC actual tenga todas las garantías: https://supabase.com/docs/guides/queues
- Remotion admite render en servidor: https://www.remotion.dev/docs/ssr . Lambda es alternativa con límites y licencia que deben revisarse: https://www.remotion.dev/docs/lambda
- Runpod Serverless ejecuta contenedores y escala a cero; arranque e idle son facturables: https://docs.runpod.io/serverless/overview

No se cotizan precios por video sin mediciones, ni se garantiza que el modelo local tenga criterio suficiente. Si falla en calidad, mejorar biblioteca/reglas o usar comparador remoto autorizado; no escalar una mala edición. Si falla por recursos del Mac, adelantar worker remoto de pruebas, sin confundir esa decisión con aprobación de calidad.

## Revisión independiente

Planificador Codex; revisor Claude Opus 5.5 high mediante Claudex; máximo dos rondas. Log separado. El usuario pidió un plan, por lo que no se inicia implementación ni se compra infraestructura en esta entrega.
