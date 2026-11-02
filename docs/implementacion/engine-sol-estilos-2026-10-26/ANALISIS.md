# Motor con Sol y preferencias editoriales antes de editar

Fecha: 26 de octubre de 2026. Alcance: análisis estático del código y documentación oficial. No se modificó el motor ni se verificó un despliegue online durante este análisis.

**Actualización posterior del usuario:** todas las pruebas serán locales hasta que la calidad justifique rentar servidor. La propuesta online de este documento se conserva como referencia futura, no como trabajo de despliegue autorizado ahora. La migración posterior del proveedor está documentada en [EJECUCION-LOCAL-SOL.md](EJECUCION-LOCAL-SOL.md); este análisis describe la base anterior a esa migración.

## Resultado

El flujo completo inspeccionado todavía usa Qwen local. Existe una base reutilizable de cinco familias visuales y diez opciones tipográficas, pero el piloto impone cantidades fijas de recursos y algunas elecciones del cuestionario no tienen un comportamiento propio en la composición. Publicar esta interfaz sin corregir esas conexiones no cumpliría el objetivo.

La entrega propuesta es: escoger preferencias, confirmar un brief, recibir una propuesta editorial de Sol, revisar el resultado y exportar usando exactamente el mismo manifiesto. El usuario debe poder probar estilos online y comprobar diferencias de composición, movimiento y recursos además de la letra.

## Hallazgos comprobados

| Área | Evidencia en el repositorio | Consecuencia |
|---|---|---|
| Dirección del flujo completo | `scripts/one_shot_worker.py:7,22–26,194`: Qwen fijo mediante Ollama | Cambiar el conector del editor antiguo no cambia este flujo. |
| Revisión de B-roll | El mismo worker usa `local_model` para candidatos y fotogramas, líneas 83 y 105 | La migración necesita cubrir texto e imágenes, no solamente la primera propuesta. |
| Editor anterior | `app/_lib/editorAi.ts` fija Opus; `ollamaEditor.ts` admite Anthropic/Ollama | No hay un proveedor OpenAI conectado en los caminos inspeccionados. |
| Acceso online | `app/api/local-intake/route.ts:10` y `run/route.ts:7,15` rechazan CLOUD/VERCEL | El flujo local no se convierte en servicio online al publicar la página. |
| Selección previa | `LocalIntake.tsx` pregunta objetivo, audiencia, familia, letra, ritmo, captions y recursos | Ya existe un punto de partida para el encargo previo. |
| Restricciones del piloto | `src/oneShotBrief.ts` y `one_shot_worker.py:187–188,227` exigen tarjetas, comparación, pasos, B-roll y música | No permiten una edición sin gráficos o sin B-roll. También pueden exigir una comparación que el discurso no contiene. |
| Estilos | `style/editorial-recipes-v1.json`, `src/editorialRecipes.ts`, `scripts/editorial_recipes.py` | Hay variantes reales de tarjetas, B-roll y transiciones; la selección de variantes se alterna por orden, no por una decisión semántica de Sol. |
| Tipografía | `style/catalog-v1.json`, `src/editorFonts.ts`, `src/OneShotVideo.tsx` | Diez opciones; cuatro incluyen una pareja de título/subtítulo. La carga de fuentes participa en el render. Falta probarlas en el despliegue objetivo. |
| Subtítulos | `src/OneShotVideo.tsx:32–52` | Agrupa seis palabras; distingue karaoke, pero no implementa un tratamiento específico de palabra clave frente al preset normal. |
| Sonido | `OneShotVideo.tsx` reproduce voz y música, sin pista SFX; el worker no consume `prefs.sfx` | Elegir efectos suaves, presentes o desactivados no produce esa diferencia en este camino. |
| Materiales | `src/EditorialPanel.tsx` distingue papel y fondos oscuros | Las opciones glass/solid no tienen aquí tratamientos visuales independientes equivalentes a lo que sugiere el catálogo antiguo. |
| Recursos propios | `one_shot_worker.py:213,223–224` deja faltantes para B-roll propio y pista propia | Hay que incorporar la carga y asignación de esos recursos. La opción “ambos” no tiene un inventario propio que combinar en el camino inspeccionado. |
| Música | `one_shot_worker.py:29` sintetiza una pieza local | La etiqueta “biblioteca con licencia” no describe la implementación actual; renombrar o integrar un catálogo real. |
| Conservación | `localUploadSession.ts:8` usa una hora de vigencia | Para comparar versiones online se necesita retención explícita y almacenamiento durable. |

Los hallazgos sobre preferencias se refieren al flujo completo de `OneShotVideo`; no implican que el editor anterior tenga las mismas limitaciones.

## Sol y uso del plan Pro

Tomar `gpt-6.1-sol` como candidato inicial dentro de la familia Sol, sujeto a disponibilidad real en la cuenta y en la integración elegida. Registrar el identificador efectivo en cada versión. Sol dirige decisiones y analiza fotogramas; FFmpeg/Remotion siguen produciendo el archivo final.

Hay dos vías de acceso distintas:

1. **Pruebas asistidas desde Codex:** usar la sesión de ChatGPT para preparar el plan y ejecutar el render local. Sirve para evaluar calidad editorial, pero no demuestra integración con la web.
2. **Motor de la web:** integrar OpenAI por API con facturación propia o implementar el flujo oficial de uso del plan ChatGPT cuando el tipo de aplicación y la cuenta sean elegibles.

La documentación oficial contempla uso del plan para aplicaciones open source y alojadas localmente. Para aplicaciones de pago o alojadas remotamente remite a un formulario de interés; no está comprobado que Cutkind tenga acceso a esa modalidad. La sesión local de Codex no concede automáticamente ese acceso a un servidor.

En la vía de uso del plan, la documentación exige streaming y `store:false`; no admite varios parámetros de la API habitual, incluidos `max_output_tokens` y `temperature`. Tampoco incluye entrada directa de audio/video ni la API de transcripción. Por ello conviene mantener la preparación/transcripción fuera de Sol y enviar texto y fotogramas seleccionados. El control de uso debe respetar estas diferencias y mostrar fallos/límites sin cambiar de facturación silenciosamente.

Fuentes oficiales consultadas:

- [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol).
- [Sign in with ChatGPT: disponibilidad y separación de identidad/uso del plan](https://developers.openai.com/siwc/quickstart).
- [Uso del plan en aplicaciones open source y locales](https://developers.openai.com/siwc/token-sharing-open-source).
- [Limitaciones de la vista previa](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).

## Experiencia previa a la edición

Usar un único cuestionario compartido por la prueba y el flujo online. Guardar un perfil reutilizable y copiar sus valores a un brief inmutable por versión del video. Permitir ajustes por video sin alterar entregas anteriores.

1. **Encargo:** objetivo, audiencia, tema, idioma, plataforma/formato y términos propios.
2. **Familia visual:** muestras reproducibles de las cinco familias existentes, con la misma grabación y frase para poder comparar.
3. **Tipografía:** pareja recomendada y elección independiente de títulos/subtítulos; tamaño, peso, énfasis y vista previa con acentos y texto largo. Comenzar con las fuentes existentes y sus licencias verificadas.
4. **Montaje:** ritmo suave/equilibrado/ágil, intensidad de movimiento y transiciones permitidas. Para esta primera prueba se conserva voz y orden; el ritmo controla recursos y movimiento, sin eliminar palabras ni prometer resúmenes.
5. **Recursos:** gráficos desactivados/esenciales/frecuentes; B-roll desactivado/selectivo/frecuente; banco/propio/ambos; encuadre enmarcado, dividido o de cobertura cuando esa variante esté implementada.
6. **Audio:** música desactivada/original sintetizada/propia y, cuando exista, biblioteca licenciada; volumen; efectos desactivados/suaves/presentes.
7. **Confirmación:** resumen visible de elecciones y restricciones, muestra corta y botón de edición. Si faltan archivos propios, señalarlos antes del procesamiento.

Las opciones deben corresponder a capacidades reales. Desactivar una capacidad debe retirarla tanto de la propuesta de Sol como de las exigencias de exportación.

## Cinco direcciones editoriales para la primera prueba

Estas son especificaciones objetivo basadas en las familias existentes, no una afirmación de que todos los comportamientos ya estén implementados.

| Familia | Tipografía inicial | Composición y movimiento | Uso de B-roll |
|---|---|---|---|
| Umbral / cine íntimo | Cormorant Garamond + Manrope | Espacio, máscaras, revelado pausado; gráficos puntuales | Selectivo y ligado a la frase; encuadre estable |
| Bitácora / documental | Space Grotesk + DM Sans | Rótulos discretos, capítulos, imágenes enmarcadas | Contexto visual y procesos; priorizar material propio disponible |
| Estampa / editorial | DM Serif Display + DM Sans | Papel, citas, subrayados y composición de revista | Recortes y marcos, con tiempos de lectura amplios |
| Pulso / social dinámico | Anton con subtítulo legible configurable | Texto de impacto, entradas breves y énfasis preciso | Inserciones ágiles; densidad ajustable, sin cubrir toda la grabación |
| Enlace / explicativo | Space Grotesk + DM Sans | Ideas conectadas, pasos y comparaciones realmente dichas | Evidencia visual ilustrativa, capturas o demostraciones disponibles |

El usuario puede cambiar la tipografía sin perder la familia. Un estilo debe diferenciar también posiciones, tiempos, movimiento, jerarquía y tratamiento de recursos. No todos los videos necesitan todos los tipos de gráfico.

## Contrato entre cuestionario, Sol y render

Crear un brief versionado que reúna familia, tipografías por función, captions, ritmo, movimiento, densidades, transiciones, políticas de B-roll/audio, recursos aportados y restricciones. Enviar a Sol ese brief junto con:

- Transcripción con IDs y tiempos.
- Inventario de recursos y licencias disponibles.
- Variantes implementadas por el renderer y sus restricciones.
- Fotogramas necesarios para revisar recursos, según autorización del encargo.

Solicitar una salida estructurada con eventos, palabras/frases de origen, tiempos, variante, recurso y motivo. Validar la respuesta antes de aplicarla: referencias existentes, tiempos válidos, ausencia de solapes, políticas del usuario, licencias y variantes reales. Las comparaciones sólo se permiten si están respaldadas por la transcripción.

Actualizar la identidad de caché para incluir modelo/proveedor, revisión del prompt, esquema, brief e inventario relevante. El caché actual no identifica al modelo; una migración no debe reutilizar decisiones de Qwen y presentarlas como generadas por Sol.

Cada ejecución registra proveedor/modelo efectivo, versiones de brief/renderer, consumo disponible, tiempo y validaciones. La vista previa y el MP4 usan el mismo manifiesto. Ajustes puramente visuales pueden re-renderizar sin volver a pedir decisiones semánticas.

## Arquitectura online propuesta

`Cuestionario → brief confirmado → subida → trabajo en cola → preparación/transcripción → Sol → validación → recursos → preview → render MP4 → revisión`

La interfaz web y el proceso de video tienen ciclos de vida diferentes. Un worker persistente necesita FFmpeg, transcripción y Remotion/Chromium; los archivos deben sobrevivir al proceso y a la recarga del navegador. Incorporar almacenamiento privado, versiones y estados recuperables. Evaluar el hosting existente antes de elegir infraestructura o desplegar; este análisis no verifica sus capacidades.

La dirección semántica debe exponerse mediante un adaptador compartido entre los caminos que se mantengan. Cubrir dirección, elección de candidatos y evaluación visual. Si alguna etapa sigue usando Qwen, registrarlo de forma explícita. Separar preparación/render de las llamadas al modelo permite probar Sol con la misma transcripción y recursos.

## Orden de implementación

1. **Acceso y proveedor:** comprobar la elegibilidad del plan para el tipo de despliegue; conectar Sol en una ejecución de texto y en una evaluación de fotograma con datos sintéticos. Registrar uso y modelo. No presentar login de identidad como permiso de inferencia.
2. **Brief y capacidades:** unificar cuestionarios; retirar cuotas obligatorias del piloto; conectar cada opción a un comportamiento verificable y a requisitos de exportación derivados del brief.
3. **Familias y recursos:** completar captions de palabra clave, SFX, materiales y carga de recursos propios; mostrar muestras representativas de montaje, B-roll y transiciones además de tarjetas.
4. **Ejecución online:** almacenamiento, cola, worker y recuperación. Integrar la ruta nueva en la experiencia web y probar desde el despliegue real.
5. **Comparación:** editar una grabación autorizada con las cinco familias usando Sol. Conservar versiones para evaluación visual del usuario.

## Criterios de aceptación

- El modelo efectivo de dirección es Sol y queda registrado; cambios de proveedor requieren una elección explícita.
- Las preferencias se eligen antes de editar, sobreviven a una recarga y quedan copiadas al trabajo.
- La misma grabación produce cinco versiones con diferencias observables de composición, movimiento y recursos.
- Elegir “sin B-roll”, “sin gráficos” o “sin música” produce una entrega válida sin esos recursos.
- La tipografía elegida coincide entre muestra, preview y MP4; los títulos/subtítulos respetan su función.
- Cada caption anunciado tiene comportamiento propio; el audio responde a intensidad y desactivación.
- Los recursos propios se pueden aportar y asignar. Las búsquedas de stock conservan procedencia y revisión semántica.
- El video completo conserva todas las tomas, voz y orden; los gráficos no inventan hechos y las zonas reservadas se respetan.
- El flujo funciona desde la URL online objetivo, incluida subida, recarga, recuperación de errores y descarga del MP4.
- La aprobación técnica se registra por separado de la aceptación estética del usuario.

## Límites de este análisis

No se ejecutaron pruebas de video ni llamadas de inferencia. No se comprobó la cuenta para plan usage, la disponibilidad de Sol en sus permisos ni un despliegue público. Las cinco familias y diez opciones son inventario del código; no constituyen aprobación estética ni prueba de funcionamiento online.
