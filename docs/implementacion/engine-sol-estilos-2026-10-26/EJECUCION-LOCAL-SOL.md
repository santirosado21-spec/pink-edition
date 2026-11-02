# Sol como proveedor editorial y pruebas locales

## Decisiones del usuario

Todas las pruebas y la experiencia de producto se ejecutan localmente. La renta de servidor se pospone hasta demostrar calidad suficiente. El usuario elige familia editorial, tipografías, ritmo y recursos antes de editar. Toda inferencia editorial usa Sol, incluida la selección de candidatos de B-roll y la revisión visual.

El procesamiento local no significa ejecutar Sol en el Mac: el texto editorial y las imágenes seleccionadas se envían a OpenAI mediante la sesión de ChatGPT en Codex. Whisper, orientación, preparación y render conservan su ejecución local. Los originales no se envían al modelo como archivos de video.

## Modelo comprobado

El catálogo real obtenido con `model/list` en Codex ofrece `gpt-5.6-sol`, con texto e imagen como modalidades. La llamada explícita a `gpt-6.1-sol` fue rechazada con `model_not_found`. Por ello la configuración actual fija **GPT-5.6 Sol**. No hay selección automática de una variante diferente ni cambio automático a API de pago.

La prueba de texto y la de imagen sintética respondieron correctamente con el modelo disponible. Esto demuestra acceso al modelo en esta sesión; no constituye una evaluación de calidad de edición.

## Cambios implementados

- `scripts/sol_model.py`: adaptador compartido mediante `codex exec`, login ChatGPT obligatorio, modelo explícito, entradas por stdin, archivos efímeros y JSON estructurado. El proceso ignora configuración de usuario y credenciales de proveedores por variables de entorno, usa un directorio temporal y sandbox de sólo lectura; desactiva herramientas de shell, conectores, navegador, plugins y agentes. Un bloqueo local evita inferencias simultáneas. No se imprime el contenido privado de logs del proveedor.
- El adaptador guarda recibos de modelo, uso, tiempo, resultado y hash de solicitud en `work/_editor-ai/sol`. No calcula un costo API ni guarda transcripciones en ese registro. Las sesiones de inferencia son efímeras.
- `scripts/one_shot_worker.py`: dirección, selección de clips y evaluación de fotogramas llaman al mismo adaptador de Sol. Actualiza la identidad de caché para incluir modelo y revisión; registra metadatos de IA en el manifiesto del video.
- `app/_lib/solEditor.ts`: puente local TypeScript/Python con comprobación de sesión y límites de tiempo/tamaño de respuesta.
- `app/_lib/propose.ts`: el editor anterior también usa Sol, con validación editorial existente y todas las preferencias estructuradas disponibles para el modelo.
- `app/_lib/contextualProposal.ts`: la ruta de fotos contextuales también usa Sol, incluyendo revisión visual.
- Se retiró el transporte Anthropic de `editorAi.ts`. `ollamaEditor.ts` queda como compatibilidad de importaciones antiguas que delega a Sol; ya no contiene conexión a Ollama.
- La ruta de propuestas y los manifiestos muestran OpenAI y el identificador de Sol. Las rutas cloud siguen bloqueadas para la prueba.
- El cuestionario explica que el procesamiento se realiza en el Mac y que Sol analiza texto y muestras visuales mediante ChatGPT.

## Verificación

Ejecutadas sin datos privados de videos:

- Llamada real de texto sintético con Sol: respuesta estructurada correcta.
- Llamada real con fotograma sintético rojo: identificación correcta.
- Llamada real de texto con herramientas de agente desactivadas: correcta.
- Seis pruebas unitarias del adaptador: sesión ChatGPT, rechazo de API key, bloqueo cloud, modelo sin fallback, respuesta incompleta, esquema obligatorio, recibos y eliminación de imágenes temporales.
- Pruebas del plan editorial: anclas, respuesta JSON y esquema, preservación y propagación de errores sin otro proveedor.
- Pruebas de compatibilidad: las importaciones antiguas no recuperan Ollama si falla Sol.
- Catorce grupos de regresiones de selección contextual, rechazo visual, preferencias y protección de cara/subtítulos.
- Pruebas de candidatas/versiones, entradas congeladas de render y conservación de historial.
- Seis pruebas de cobertura de tomas/voz y cuatro de recetas editoriales.
- TypeScript de Remotion y de Next.

El recorrido real TypeScript → Python → Sol → plan validado pasó con una transcripción sintética vacía, sin inventar eventos. No se ha regenerado un MP4 con grabaciones del usuario en esta sesión; hace falta seleccionar el lote para evaluar la entrega completa y su estética.

## Investigación de estilos con REA

Actualización del 27 de octubre: el usuario seleccionó **CapCut e InVideo**. La primera investigación y sus límites están en [capcut-invideo-2026-10-27/INVESTIGACION.md](capcut-invideo-2026-10-27/INVESTIGACION.md). El párrafo siguiente conserva el estado anterior del 26 de octubre.

Se leyó la skill `reverse-engineer-anything` y se comprobó la sesión del servidor REA. No hay un objetivo de aplicación seleccionado para esta investigación. Se solicitó al usuario indicar aplicaciones o enlaces; no se atribuyen patrones a una aplicación sin analizarla.

Una vez seleccionadas, investigar por aplicación:

1. Familias tipográficas y jerarquías de títulos/subtítulos.
2. Cadencia de cortes, tratamiento de pausas y relación con el discurso.
3. Entradas/salidas de texto, transiciones y composición.
4. Selección, duración y colocación de B-roll.
5. Música, acentos sonoros y control de intensidad.
6. Preferencias que la aplicación permite escoger antes de generar.

Cada patrón necesita origen, evidencia REA identificable, comportamiento observado o inferido, limitaciones, receta propia propuesta y prueba local. Un hallazgo de investigación no se presenta como variante implementada. La implementación debe pasar por las familias Umbral, Bitácora, Estampa, Pulso y Enlace cuando corresponda.

## Pendientes del producto

La migración del proveedor no completa por sí sola la variedad editorial. Siguen pendientes las restricciones fijas del piloto, las opciones desactivables, los SFX, las diferencias completas de captions/materiales y la carga/asignación de recursos propios señaladas en el análisis inicial. La aceptación requiere que las preferencias cambien efectivamente el MP4 y una revisión visual del usuario sobre las cinco familias.

No se ha contratado servidor ni desplegado esta migración. El criterio previo a infraestructura es una edición local completa, reproducible y visualmente aceptada, con elecciones consistentes entre cuestionario, preview y exportación.
