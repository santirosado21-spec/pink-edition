# Ejecución local desde la sesión temporal

## Flujo implementado

Después del cuestionario y de recibir el lote, `Crear edición local` congela los IDs en el orden mostrado. Hay controles de orden y ordenación numérica por nombre. Un proceso Python independiente realiza preparación, orientación por Apple Vision, Whisper local, dirección estructurada con Qwen local, búsqueda de video en Wikimedia sin clave, revisión visual local de los candidatos y composición. El proceso publica etapas y errores; la pestaña puede recargarse y recuperar su sesión.

La orientación se estima con caras en tres muestras y cuatro rotaciones; sólo se corrige cuando una orientación supera claramente a las demás. Si es ambiguo, conserva la orientación. No es una garantía para escenas sin caras. Los originales no se modifican. Se preservan voz y orden. Los márgenes y las pausas internas de al menos 450 ms se recortan usando la unión de todas las palabras de Whisper y los intervalos de habla de Silero VAD. Se conservan 100 ms a cada lado del habla, con límites alineados hacia afuera a 30 fps. Las pausas breves permanecen. Los proxies concatenan los intervalos conservados y los subtítulos y eventos se recalculan mediante el mapa de tiempos; sourceSegments e internalRemovedSeconds permiten auditar los cortes. Las decisiones y offsets quedan en la sesión para revisión.

El director recibe frases completas con tiempos, no sólo la categoría del cuestionario. Los textos visibles deben existir en la frase elegida. Un gráfico de comparación prioriza una comparación expresada; las magnitudes sólo se dibujan proporcionalmente cuando provienen de sus etiquetas. El gráfico de ideas representa una lista, no una causalidad inventada.

## Medios y composición

- Los proxies H.264, audio, decisiones y recursos quedan dentro de la sesión temporal, fuera de `work/` y `public/work/`.
- Wikimedia: sólo clips declarados CC0 o dominio público; se guarda URL, autor y licencia. Se usan transcodes cuando existen y se verifica visualmente el clip con Qwen local. Las búsquedas externas reciben sólo conceptos genéricos; los videos y transcripts del usuario no salen del equipo.
- Música: composición instrumental original sintetizada localmente, con tempo según el carácter elegido; no es una canción comercial ni un catálogo musical externo. La voz se normaliza y la música se mantiene baja.
- El lienzo separa la grabación, los gráficos/B-roll y los subtítulos. El original se muestra completo (`contain`). Esto protege la cara por separación geométrica, sin colocar una tarjeta sobre la persona.
- Remotion Player y exportación usan el mismo componente y manifiesto. El renderizador local accede a los medios con streaming Range y CORS limitado a localhost.
- La selección de pista propia y B-roll propio aún requiere incorporación de esos recursos: se informa el faltante y no se aprueba la exportación. No se cambia esa selección en silencio.

## Estados y conservación

`running` → `ready` o `incomplete`; errores explícitos `failed`. Exportación `exporting` → `exported`. Un resultado con requisitos faltantes puede revisarse, pero no exportarse como completo. El bloqueo y el PID impiden otra ejecución o descarte mientras está en uso. La sesión queda protegida durante el proceso y renueva su hora de vigencia al terminar. Un proceso muerto se muestra fallido.

`Exportar MP4` genera un archivo temporal; `Descargar video editado` permite conservarlo en el equipo del usuario. No se crean trabajos permanentes en la galería. El descarte elimina toda la sesión. No hay procesamiento con el Mac apagado, cola cloud ni recuperación automática de un proceso interrumpido: puede reintentarse usando las entradas temporales.

## Verificación

- TypeScript y regresiones de subida múltiple, cuestionario y personalización.
- `test_local_execution.mjs`: origen, entrada requerida, bloqueo de exportación incompleta, streaming Range, rutas no autorizadas, retención durante ejecución y descarte bloqueado.
- `one_shot_review.mjs`: fotogramas renderizados de tarjetas, comparación, ideas y B-roll; opcional MP4 temporal completo para QC.
- `test_local_preview_browser.mjs`: restauración real de sesión, reproducción, exportación habilitada y móvil.

Los conteos y las validaciones de estructura no equivalen a aprobación editorial. La pertinencia del modelo, la transcripción de nombres, la calidad musical y la estética deben revisarse con el usuario. El camino antiguo del editor no se ha migrado a esta composición; esta ejecución es una ruta local aislada. Los efectos de sonido y el catálogo completo de estilos del editor anterior aún no se trasladan a esta ruta.

## Prueba con el lote recibido

Siete MOV en orden 1–7. Apple Vision detectó giro de 270° en las siete tomas. La revisión de imagen confirmó el encuadre vertical correcto. La envolvente VAD + palabras reduce el montaje a 108,77 segundos; se conservan 277 palabras y todos los hashes de originales. La composición contiene dos tarjetas literales, comparación de velocidades, gráfico de ideas/datos y dos clips CC0/dominio público revisados localmente. El informe vive en `review/manifest-qc.json` de la sesión temporal; los medios de prueba no se conservan en la galería.

Validación final: MP4 temporal de 108,779 s con audio; pico PCM 0,831 (sin clipping en la prueba), correlación de muestras de voz por toma entre 0,9892 y 0,9971, sin desfase detectado en esas muestras. Prueba Playwright de reproducción, recarga y móvil aprobada. Exportación real + descarga verificadas con un fixture sintético y limpiadas al terminar. La revisión técnica no sustituye la aprobación estética del usuario.


### Corrección de pausas internas — 20 de octubre
La sesión 3b0021cf se regeneró con 12 cortes internos (5,5 s retirados) y márgenes más ajustados: duración 96,768 s frente a 108,779 s. Se conservaron las 277 palabras, hashes originales y orden 1–7. Recalculados subtítulos y recursos: 2 tarjetas, comparación, gráfico de ideas y 2 B-rolls. Pasaron seis pruebas de intervalos, typecheck, controles de ejecución local, Playwright y render completo temporal. La comparación de voz entre proxies y render obtiene correlación 0,9879–0,9962 y desplazamiento 0 ms en las muestras. El VAD y las palabras protegen conservadoramente cualquier intervalo dudoso; esto no garantiza eliminar cada respiración o ruido. Evidencia temporal en review/.

### Tipografía visible y aplicada — 20 de octubre

El cuestionario usa FontPicker con seis muestras de archivos reales, ejemplo de subtítulos y letras acentuadas. Agregadas Anton, Montserrat y Bebas Neue a Inter Display, Plex Serif y Plex Mono. El identificador elegido se conserva en el brief. OneShotVideo carga el archivo local correspondiente antes de mostrar o renderizar texto, y aplica familia/peso a tarjetas, gráficos y subtítulos. Se retiraron los reemplazos por Arial y Georgia. Los nombres internos de las fuentes se aíslan de las declaraciones CSS de la interfaz. Un fallo de carga bloquea el render para no entregar una tipografía sustituta inadvertidamente.

Verificación: typecheck, contrato de catálogo y cuestionario, selección/persistencia real por Playwright, seis renders de Remotion, muestras de escritorio y móvil sin desbordamiento. Las fuentes nuevas incluyen licencias OFL y procedencia en public/fonts/SOURCES.md. No hay cambio de la tipografía elegida en el brief de la sesión existente: serif ahora significa el archivo Plex Serif en todos los textos.

### Imagen ausente en segunda toma y nueva dirección tipográfica

El usuario reportó que en el segundo clip sólo veía transcripción, no imagen. Al investigar, la sesión temporal 3b0021cf ya no tenía archivos; no se pudo reproducir ni determinar la causa exacta del caso original. No declarar reparada esa entrega hasta reprocesar los originales.

- La reproducción de las tomas usa OffthreadVideo, con pausa durante buffering y un error visible y bloqueante en render si un archivo falla. Los B-rolls conservan su componente anterior.
- La vista previa muestra las tomas, intervalos y botones para saltar a cada una. La exportación compara el inventario de sesión y el orden congelado con las escenas.
- El worker ejecuta verify_source_coverage antes de publicar: orden completo, sin duplicados, continuidad, palabras y timestamps por toma, duración y presencia de streams de audio y video.
- El MP4 final comprueba correlación de muestras de audio por toma antes de habilitar descarga. Esto no sustituye escuchar y ver toda la entrega.
- test_source_coverage cubre segunda toma ausente, duplicada, voz cortada, palabra cambiada y timestamp desplazado. test_local_export usa tres clips de colores y tonos diferentes; comprueba píxeles de la segunda toma en Player real y las tres tomas exportadas, además del audio. Son pruebas sintéticas, no la validación de la sesión expirada.

Figma: https://www.figma.com/design/mu3Wnnj3hJ1bgh5aQWhvWb?node-id=2-2. Cuatro propuestas editables: Editorial cálido (DM Serif Display / DM Sans), Cine íntimo (Cormorant Garamond SemiBold Italic / Manrope), Revista (Bodoni Moda / Manrope), Documental moderno (Space Grotesk / DM Sans). Familias verificadas mediante API y captura de Figma. Se cargan los archivos locales correspondientes en cuestionario y Remotion, incluidos pesos y cursiva. Las opciones previas quedan plegadas; no se presentan como aprobadas por el usuario. La aprobación estética requiere su elección, no sólo que los archivos carguen.
