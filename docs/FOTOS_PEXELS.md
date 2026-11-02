# Fotos para el video: Wikimedia sin clave y proveedores opcionales

Actualización del 20 de octubre de 2026. **Wikimedia Commons es el proveedor predeterminado sin clave.** Se consulta su API pública directamente; no requiere cuenta de Pexels/Pixabay. Necesita Internet para buscar y descargar. Las imágenes descargadas se usan desde la copia local.

## Configuración actual

`EDITOR_STOCK_PROVIDER=wikimedia` ya está configurado en `motion/.env.local`. No hace falta obtener una clave. Sin selección explícita el servidor también elige Wikimedia. El selector manual empieza en Wikimedia.

Se buscan imágenes CC0, se verifica de nuevo la licencia al descargar y sólo se admiten JPEG, PNG o WebP alojados en los dominios de archivos de Wikimedia. No se importan SVG, archivos sin licencia reconocida o recursos con otras licencias. El crédito se conserva sin HTML. Hay cuotas públicas: un fallo de red no se sustituye por imágenes inventadas.

Pixabay y Pexels siguen siendo opciones manuales para quien ya tenga sus claves; Openverse también se conserva como alternativa sin clave. No son requisitos del piloto. Alcance actual: imágenes estáticas; no se ha integrado la inserción automática de clips de B-roll.

## Funcionamiento

El selector manual busca en «Fotos para esta frase». El director local genera consultas de un catálogo acotado relacionadas con frases exactas, descarga como máximo dos candidatos por búsqueda y usa Qwen visión local para verificar su contenido. No se manda el transcript ni el video al banco, sólo los términos de búsqueda. El usuario revisa el borrador antes de guardar.

La opción Pixabay recibe búsquedas de fotos con safesearch y ancho mínimo de 1000 píxeles. Se consulta nuevamente el ID antes de descargar, se restringen los dominios de imagen y se conserva autor, URL, licencia y fecha junto al archivo. La vista previa y el render usan la copia local. El editor muestra el proveedor y los enlaces a los autores.

Las respuestas de Pixabay se guardan 24 horas en `work/_stock-cache/pixabay/`, como exige su documentación. La caché no guarda la clave; las búsquedas concurrentes idénticas comparten petición. No se hacen descargas masivas ni reintentos automáticos ante cuota agotada. Los errores de transporte no devuelven la URL que lleva la clave.

## Otras fuentes

- Openverse: opción sin clave, limitada en este editor a CC0, sin contenido adulto y a imágenes de Wikimedia/Flickr. Disponible manualmente o con `EDITOR_STOCK_PROVIDER=openverse`. En la prueba actual, «video editing timeline» devolvió HTTP 200 sin resultados; «video editing» y «microphone» agotaron el tiempo de espera. Esto es evidencia de estas consultas, no una declaración de caída global.
- Pexels: se conserva compatibilidad con los proyectos anteriores y puede seleccionarse con una clave existente; ya no es el requisito del piloto.

## Verificación histórica de Pixabay (19 de octubre)

TypeScript y pruebas con transporte simulado cubren búsqueda/descarga Pixabay, procedencia, restricciones de host, cuota, secreto, caché persistente, caducidad y concurrencia. El validador admite fotos Pixabay con su licencia y rechaza licencias inventadas. La propuesta contextual conserva los controles de pertinencia y cara/captions.

Playwright sobre la app real verificó Pixabay seleccionado y el mensaje de clave ausente, sin errores de página. No se ejecutó una descarga real de Pixabay porque no se consiguió clave. Ese camino quedó opcional; la verificación actual de Wikimedia aparece debajo. No se modificó el montaje original.

Fuentes: [API Pixabay](https://pixabay.com/api/docs/), [licencia Pixabay](https://pixabay.com/service/license-summary/), [autenticación Openverse](https://docs.openverse.org/api/reference/authentication_and_throttling.html). Cada recurso debe revisarse para el uso final; las fotos ilustrativas no son evidencia de afirmaciones narradas.

## Evidencia nueva: Wikimedia sin clave

Pruebas reales del 20 de octubre: API local devuelve 12 imágenes para «microphone»; se descarga el archivo Wikimedia 61688654, con autor Kelly Sikkema y licencia CC0. Inspección visual confirma que muestra un micrófono. Sólo se descargó para verificar el transporte, no se agregó al montaje de img-2405. Evidencia: `work/ollama-pilot/integration/wikimedia-download.json`.

La propuesta real de img-2405 ejecutó Qwen local, buscó «video editing timeline», descargó candidatos y los rechazó visualmente por ser logotipos sin un timeline visible. Resultado: cero recursos nuevos, siete decisiones conservadas. Las afirmaciones sobre la plataforma requieren capturas del producto. No se guardó el borrador ni se aprobó la edición. Evidencia: `wikimedia-proposal.json`. Los tests anteriores de Pixabay son históricos; el piloto actual no espera esa clave.

Fuente de integración: https://commons.wikimedia.org/wiki/Commons:API/MediaWiki.
