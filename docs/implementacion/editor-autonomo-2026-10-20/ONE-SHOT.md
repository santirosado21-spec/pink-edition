# Cambio de contrato: primera edición completa

**Estado actualizado:** el flujo local ya está conectado a ejecución, vista previa y exportación explícita. Ver `EJECUCION-LOCAL.md` para implementación, pruebas y límites actuales. Las menciones de ejecución pendiente que siguen documentan la etapa anterior de recepción.

Instrucción del usuario, 20 de octubre de 2026. Este documento tiene precedencia sobre el flujo de biblioteca/editor manual del plan anterior.

## Flujo acordado

1. Preguntar **en cada lote de grabaciones**, antes de permitir seleccionar/subir un archivo: objetivo, audiencia, tema, marca, idioma, nombres propios, ritmo, tipografía, captions, color, tratamiento de tarjetas, transiciones, música y origen de B-roll.
2. Confirmar el encargo. Congelar respuestas y requisitos para esa ejecución; no depender de cambios posteriores del perfil.
3. Admitir la grabación y los recursos propios en una sesión temporal.
4. Ejecutar preparación → dirección → búsqueda/selección de recursos → composición → mezcla → proxy → QC sin pedir al usuario que añada manualmente los elementos.
5. Mostrar la primera edición y un informe de cumplimiento. La primera propuesta debe ser evaluable sin correcciones nuestras ocultas.
6. Sólo **Exportar y conservar** conserva el resultado final. Descartar elimina temporales. La revisión por chat queda fuera de este hito.

Corrección explícita del usuario: **confirmar las preguntas debe habilitar inmediatamente la subida**. Implementado en `/app`: se crea una sesión temporal con una copia del brief y se habilita el selector. La recepción funciona; no se afirma que dirección, edición automática completa o exportación final estén implementadas. El estado del motor se informa por separado y no bloquea la recepción.

## Mínimos de esta prueba

| Elemento | Requisito | Qué no cuenta |
|---|---|---|
| Música | Pista licenciada/propia, mezcla bajo la voz, entrada y salida | Un SFX o el audio original sin pista |
| Tarjetas | Al menos 2 tarjetas de texto/ideas, respaldadas por frases exactas | Subtítulos normales |
| Gráficos | Al menos 2 recursos explicativos distintos: proceso, comparación, relación, dato realmente dicho | Contar las mismas tarjetas una segunda vez; inventar números |
| B-roll | Al menos 2 intervalos de clips de apoyo pertinentes, con voz principal continua | Fotos estáticas; logos genéricos como demo del producto |
| Transiciones | Fronteras reales del montaje, compatibles con el estilo; mínimo operativo inicial de 2 | Cortar palabras o poner una animación en cada palabra |
| Integridad | Voz y orden conservados, cara/captions libres, todos los recursos trazables | Aprobar sólo porque hay suficientes efectos |

Los mínimos son del servidor (`src/oneShotBrief.ts`), no del modelo. Un estilo sobrio cambia intensidad/duración, no elimina los mínimos. Instrucciones contradictorias se resuelven antes de admitir el video. Falta de cobertura/licencia/espacio → resultado **incompleto** y explicación concreta; nunca sustituir por decoración arbitraria ni marcar sólo-transcripción como terminado.

**Pendiente:** el validador de entrega final, los contratos para música/B-roll/tarjetas textuales y sus renderers. El contrato del brief no es evidencia de que existan estas capas.

## Almacenamiento temporal: recepción implementada, ejecución/exportación pendientes

- Recepción implementada en el directorio temporal del sistema, fuera de `work/` y `public/work/`, con UUID y permisos privados. La vista previa muestra el original mediante un object URL de la pestaña, sin publicar el archivo recibido.
- Las subidas se serializan mediante un lock. El cliente deshabilita descarte durante la transferencia.
- Implementado: descarte explícito y expiración a una hora desde la última recepción completada; transferencias con actividad reciente protegen sus temporales. Barrido cada minuto mientras el servidor está activo y al volver a utilizar las APIs tras un reinicio. Cerrar la pestaña no garantiza borrado inmediato; la expiración sigue vigente.
- Antes de cerrar el Mac, suspender/cancelar correctamente; sin prometer procesamiento con el equipo apagado.
- Exportación explícita: copia atómica del MP4 aprobado y manifiesto/licencias necesarios, sin conservar por defecto originales, proxies, mattes ni borradores.
- Probados: recepción real, archivo inválido, concurrencia, descarte y expiración. Pendientes: procesamiento, exportación interrumpida y recuperación de ejecución. La recepción ya está habilitada.

## Prioridad revisada de implementación

1. Sesión temporal, limpieza y conservación explícita (adelantar parte de B1/A0).
2. Contrato editorial y capas reales: tarjeta textual, gráfico explicativo, clip B-roll y pista musical; assets locales/licenciados.
3. Director con brief y mínimos, sin pedir coordenadas ni código al modelo.
4. Orquestación automática tras la subida; sin botón manual «Proponer».
5. QC duro + evaluación editorial de primera entrega; exportación final sólo cuando estén satisfechos los requisitos.
6. Conectar la recepción ya disponible con la edición completa y probar una grabación nueva. Comparación interna/historial son herramientas de diagnóstico, no tareas que el usuario deba completar.

## Qwen: decisión basada en una prueba válida

Hallazgo verificable: la ruta antigua de subida llamaba `startPipeline(..., "prepare")`, no el director. `SoundDesign.tsx` compone efectos, no música de fondo. El plan/renderer actual no tiene una capa de B-roll. Por ello el resultado de sólo transcripción **no demuestra una limitación de Qwen**.

No se garantiza tampoco que el modelo local de 9B alcance el criterio deseado.

- Primero verificar que un plan escrito manualmente con todos los elementos pasa compilador y render: esto aísla fallos de código.
- Después usar varios clips/briefs sintéticos y grabaciones de evaluación no usadas para ajustar prompts. Registrar primera respuesta, latencia, memoria, cumplimiento, pertinencia y cambios humanos.
- Separar fallo de comprensión, fallo de búsqueda, fallo de disponibilidad de recursos y fallo de composición. Un modelo mayor no proporciona por sí solo footage ni un renderer.
- Si Qwen falla en comprensión/selección con el motor funcionando, comparar un director alternativo con el mismo contrato y recursos. Mantener render, mezcla y controles de geometría deterministas.
- No se cambió ni descargó ningún modelo en este turno. No se llamó a una API de IA ni se envió contenido privado a terceros. La revisión Claude/Claudex sigue pendiente por la incompatibilidad del CLI ya documentada.

## Cambios y comprobación de este turno

- Borrado explícito de siete trabajos locales, medios preparados, subidas temporales y copias de pruebas: 1.260.135.003 bytes en 20 objetivos. Auditoría sin copias de los videos: `limpieza-local.json`.
- Originales/referencias fuera de esos trabajos conservados. No se vació ninguna cuenta cloud.
- `/app`: cuatro pasos previos; después de confirmar aparece «Seleccionar videos». Sin lista de videos antiguos y sin chat posterior.
- `/api/local-intake`: valida respuestas y crea una sesión temporal con brief congelado, UUID y vencimiento. DELETE descarta sesión y todos sus archivos.
- `/api/jobs/upload`: exige sesión confirmada antes de consumir bytes (428 sin ella); recibe varios archivos sin tope fijo de bytes ni cantidad, en streaming y con identificadores independientes, verifica con ffprobe duración ≤120 s, formato legible, dimensiones válidas y audio (horizontal y vertical admitidos). Guarda sólo en la sesión temporal. Devuelve «received», nunca «done», y no inicia el pipeline antiguo de sólo transcripción. Peticiones de otro origen: 403; sesión expirada: 410; concurrente: 409; nuevas subidas secuenciales admitidas.
- Enlaces de trabajos borrados redirigen al cuestionario.
- Tests: `scripts/test_one_shot_intake.mjs`, typecheck, regresiones de personalización y `scripts/test_one_shot_browser.mjs` sobre Next real. La prueba de navegador usa un video sintético de un segundo, lo recibe y lo descarta; comprueba preguntas, habilitación posterior, galería vacía y vista móvil. No evalúa edición. Los fixtures de video se eliminan.

## Ampliación: múltiples videos sin tope de peso

Selector múltiple, cola secuencial y opción de añadir más. Cada fallo se informa sin borrar los archivos recibidos. No existe tope fijo de bytes o cantidad; siguen aplicando espacio libre y validación de formato, dimensiones válidas, audio y duración de 120 s por grabación. No hay reanudación de transferencias interrumpidas. Los previews usan archivos de la pestaña, sin leerlos completos en memoria ni publicarlos. Prueba real de navegador: dos archivos juntos, un tercero después y descarte del lote. La prueba de tamaño declarado verifica que no se rechaza por 500 MB; no se ha transferido un archivo real de varios GB.

Actualización: se aceptan grabaciones horizontales además de verticales, conservando las dimensiones originales en el recibo. Validado con un lote mixto en navegador.
