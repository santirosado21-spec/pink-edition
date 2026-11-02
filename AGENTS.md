# Reglas para agentes y colaboradores

## Clasificación de fuentes — 27 de octubre de 2026

- Antes de editar, clasificar cada original con Sol: crudo, editado o dudoso. Los editados son referencias de aprendizaje; los dudosos y las mezclas se bloquean hasta revisar. No usarlos como pruebas de edición de crudo.
- Extraer patrones de las referencias con evidencia temporal y procedencia. Separar observado, implementado y aprobado por el usuario; un patrón investigado no equivale a un efecto disponible.
- Aplicar las adaptaciones implementadas a material crudo, respetando el brief. Conservar las versiones previas y excluir de las comparaciones los intentos realizados sobre videos ya editados.

## Decisiones del usuario — 26 de octubre de 2026

- Toda inferencia editorial del motor debe usar la familia Sol: dirección, selección de recursos y revisión visual. No cambiar de modelo/proveedor ni de facturación automáticamente.
- El catálogo comprobado de Codex en este equipo ofrece `gpt-5.6-sol`; `gpt-6.1-sol` fue rechazado con `model_not_found`. Usar el modelo disponible explícito y registrar cualquier cambio futuro.
- Las pruebas, interfaz, preparación, almacenamiento y render se ejecutan localmente hasta validar un producto que justifique rentar servidor. Las consultas a Sol usan OpenAI mediante la sesión ChatGPT de Codex.
- Investigar patrones de otras aplicaciones con REA sobre objetivos identificados por el usuario. Documentar evidencia, límites y comportamiento observado antes de afirmar que un estilo fue extraído o implementado.
- Mantener la elección previa de tipografías, familia editorial, ritmo y recursos en el brief de cada video.

- Editar grabaciones reales y preservar toda la voz en la demo actual.
- Conservar el orden original; recortar únicamente tramos sin habla.
- Aplicar la pareja tipográfica y familia editorial elegidas por el usuario; no forzar Inter Display ni fuentes genéricas. Las fuentes deben coincidir en cuestionario, preview y exportación.
- Diseñar gráficos ligados a frases concretas. Mantener rostro y captions libres.
- No inventar datos, gráficas clínicas ni un CTA que no fue grabado.
- Elegir efectos licenciados, con tiempos y ganancias explícitos; conservar procedencia.
- Animar con el frame de Remotion. No usar animaciones CSS dependientes del reloj.
- No subir videos, transcripts, timelines privadas, claves o entornos virtuales.
- Preservar versiones anteriores y los cambios de otros colaboradores.
- Validar TypeScript y la entrega MP4; distinguir QC técnico de aprobación estética.
- Documentar decisiones en español; nombres de código en inglés.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Dirección editorial y variedad

- Consultar `docs/estrategia/variedad-editorial-2026-10-20/INVESTIGACION.md` y `style/reference-library-v1.json` al ampliar estilos.
- Reutilizar las familias Umbral, Bitácora, Estampa, Pulso y Enlace; distinguir patrones documentados de variantes realmente renderizables.
- Variar composición y movimiento con intención, además de tipografía. Evitar resolver todos los recursos con el mismo panel/resorte.
- Cada efecto debe tener propósito, anclaje al discurso y variante implementada. No inventar datos ni sustituir pertinencia por variedad aleatoria.
- No declarar aprobado un estilo por pasar pruebas técnicas; registrar la validación estética del usuario. No afirmar que un recurso investigado ya está integrado.
- Verificar imagen y voz por toma y eventos reales antes de declarar una edición completa; contar beats no demuestra transiciones.

## Contrato de pruebas naturales — 27 de octubre de 2026

- `resourcePolicy: relevant-only` se elige y confirma antes de subir: no exige mínimos de tarjetas, gráficos o B-roll. Si no hay apoyo pertinente, conservar A-roll. Los briefs históricos sin este campo siguen en modo `showcase` con sus mínimos; no reinterpretarlos silenciosamente.
- Conservar resolución de los proxies hasta 1920 px y exportar vertical a 1080×1920 cuando todas las tomas lo permitan. No afirmar que escalar un original pequeño recupera detalle.
- El encuadre y la zona de captions se miden sobre proxies reales. La falta de detección no es prueba de espacio libre; omitir/recortar el overlay o reservar espacio, sin borrar voz.
- Un stock ilustrativo debe mostrar una acción u objeto pertinente; no tiene que probar las cifras narradas. Rechazar metáforas ajenas y conservar procedencia. Descargar únicamente el fragmento necesario.
- La revisión visual automática recibe tiempos de captions para no marcar pausas intencionales como texto perdido. Su veredicto nunca sustituye la aprobación estética del usuario.

## Cuestionario visual — decisión del usuario, 27 de octubre de 2026

- En /muestras y en el cuestionario previo a la carga, usar solo imágenes estáticas para mostrar letras, efectos y estilos. No montar Player, video ni muestras de audio en ese flujo. Los videos originales y el editor posterior a la carga siguen siendo videos.
- La interfaz y las imágenes de muestra usan exclusivamente la identidad Cutkind de app/cutkind.css: coral, crema, tinta y sus neutros. No trasladar el color de marca del video a bordes, fondos, resaltados ni controles del cuestionario. Mantener separado el color elegido para exportar.
- Continuar investigación REA sobre CapCut y Canva con evidencia; distinguir patrones observados, reconstrucciones propias y recursos no disponibles.

## Recursos elegidos en el cuestionario

- `support_media` distingue auto/video/still/none; still es una lámina de un clip revisado, no un banco de fotos. La elección explícita video tiene precedencia sobre la lámina automática de Estampa.
- `emphasis_mode` distingue overlay/fullscreen/none. Fullscreen es un intertítulo autorizado temporalmente: mantener la toma y voz montadas debajo, texto literal y sin duplicar captions. No requiere recorte de persona.
- `graphics=none` y `graphic_kinds` restringen los gráficos compare/steps; aplicar la restricción antes de la búsqueda de stock y composición. Las exclusiones no se delegan solo al prompt.
- Fotos independientes y reemplazo del fondo de persona siguen como conceptos no seleccionables; no afirmar que existe segmentación ni copiar recursos propietarios.

- Revisión posterior con el usuario: evitar personajes infantiles y arquitectura decorativa en muestras. Gráficos y medios muestran el recurso; silueta neutra solo para explicar la posición del sujeto. La muestra general permanece cerrada bajo «Ver ejemplos de estilo», sin columna flotante ni imagen automática antes de las preguntas. `/app?new=1` inicia en el paso 1 sin restaurar ni eliminar la sesión anterior.

## Cuestionario rápido — 28 de octubre de 2026

- Inicio nuevo con preset Explicativo, dos pasos y escritura opcional. Limpio/Explicativo/Impacto expanden preferencias concretas; conservar ajustes avanzados e imágenes estáticas opcionales.
- En modo natural, la frecuencia controla límites y separación real entre apoyos (12/8/6 s), nunca velocidad de voz. Excluir recursos y limitar propuestas antes de buscar stock. Briefs históricos showcase conservan su contrato.
- Enviar al director solo intención, restricciones, referencias y transcripción; aplicar fuente/color/audio localmente. No convertir medidas de bytes del bloque de preferencias en afirmaciones sobre tokens o costo total.
- Sin apoyos permitidos, omitir la consulta de dirección editorial; mantener clasificación y revisión necesarias. Registrar la omisión, sin afirmar que toda la edición usa cero tokens.
