# Catálogo y memoria de marca — prueba local

El cuestionario está en `/estilo`. Guarda el perfil en esta Mac y cada video nuevo recibe una copia en su plan. Cambiar el perfil no modifica automáticamente videos anteriores; en el editor se puede elegir «Usar mi estilo actual».

## Opciones disponibles

La fuente de verdad es `style/catalog-v1.json`, compartida por TypeScript y Python. Incluye:

- Tres tipografías: Inter Display, IBM Plex Serif e IBM Plex Mono. Una fuente y tamaño uniforme por video; la paginación se recalcula al guardar sin cambiar palabras ni tiempos.
- Catorce tipos de gráfico: trece animaciones procedurales y una opción de foto de archivo. Se puede limitar cuáles propone el editor. Las proporciones y cifras deben corresponder a lo pronunciado.
- Tres acabados: vidrio, papel y color de marca.
- Tres transiciones entre tomas: corte directo, acercamiento breve y destello.
- Tres familias de sonido con muestras reproducibles: aire, digital y discreto, además del control de intensidad o silencio.
- Marca, vocabulario, idioma español/inglés/mixto, color y estilo de subtítulos.

Los ejemplos de gráficos usan el mismo renderer de las exportaciones. Las vistas previas se cargan cuando se solicitan, sin reproducción automática; sólo un audio o video de ejemplo suena a la vez. El cuestionario tiene controles táctiles y diseño adaptable. Se revisó a 390 × 844; falta comprobarlo en Safari de un iPhone real. Esto es una web adaptable, no una aplicación nativa iOS.

Las fuentes IBM Plex se descargaron del repositorio oficial Google Fonts (`ofl/ibmplexserif` y `ofl/ibmplexmono`); su licencia OFL está en `public/fonts/IBM-Plex-OFL.txt`. Las muestras Kenney conservan su licencia existente y se convirtieron a WAV para reproducción móvil.

## Imagen y subtítulos

`PinkEdit` reproduce una sola imagen original. El recorte de persona se conserva únicamente como dato de colocación: superponer un segundo decoder de video producía la silueta doble al moverse. Los gráficos se colocan en espacios libres; ya no se vuelve a dibujar la persona sobre ellos.

El modelo local predeterminado es Whisper large-v3-turbo, con alineadores español e inglés instalados en esta Mac. El modo mixto hace detección automática, alinea el texto y busca intervalos de voz sin texto. Puede intentar recuperar esos intervalos con otra detección de idioma, hasta dos pasadas adicionales. Sólo se admiten español e inglés: no se descargan alineadores de otros idiomas por una detección dudosa de ruido.

En modo mixto se conserva el audio completo y se muestra un aviso de revisión. Por ahora no se recortan pausas en este modo; por tanto, una única toma no tiene transiciones. No se promete reconocimiento perfecto de nombres ni cambios muy breves de idioma. Los intervalos no recuperados quedan registrados en `transcript.json` como `uncovered_speech`. Una cobertura completa de palabras reconocidas no demuestra que el ASR haya reconocido toda la voz.

## Comprobaciones

```sh
npm run typecheck
node scripts/test_brand_catalog.mjs
.venv/bin/python scripts/test_brand_catalog.py
```

Se comprobó compatibilidad con perfiles anteriores, validación de opciones, fuentes y archivos de sonido, filtrado de propuestas, conservación de palabras/tiempos al paginar y detección de huecos sin atravesar texto reconocido. Se probó guardar y recuperar el perfil por la API, restaurando después el perfil original. El build de Next pasó y se renderizó un fotograma real con Plex Serif.

Una prueba local de voz sintética concatenó español e inglés. El flujo final recuperó ambas partes completas: «Hoy vamos a hablar de tres ideas para mejorar tus videos. First, keep it simple. Second, tell your story. Third, practice every day.» Las primeras variantes de ASR omitían frases o añadían palabras; se descartaron.

La revisión del video del usuario se guarda como un trabajo separado, `img-2334-revision`, para no sustituir el resultado previo. Todo el procesamiento y los medios permanecen en la Mac.

El MP4 de revisión pasó el QC técnico: 1080 × 1920, 30 fps, H.264/AAC, decodificación completa, duración dentro de tolerancia, 136 palabras reconocidas conservadas, −14.18 LUFS y −1.25 dBTP. Se corrigió el finalizador para que atienda picos demasiado altos aunque la sonoridad media ya esté dentro de tolerancia, dejando margen antes de codificar AAC. Sigue pendiente revisar de oído el intervalo aproximado 42–44 s señalado por el detector de voz sin texto; el audio de ese intervalo está conservado.

## Colaboración y continuidad

Se usó Graphify para localizar dependencias y reducir lecturas del repositorio. No se midió un ahorro numérico de tokens.

El usuario autorizó expresamente compartir `PinkEdit.tsx`, `preferences.ts`, `transcribe.py` y `prepare_full_demo.py` con Claude mediante Claudex. Se preparó un contexto limitado a esos cuatro archivos y un resumen de pruebas, sin videos, transcripciones ni claves. El primer arranque no llegó a la API porque el modo simple no utilizó la sesión Pro (cero tokens informados). Con la sesión activa y excluyendo herramientas, MCP, memorias e instrucciones automáticas, el intento siguiente llegó al límite de 240 segundos sin devolver informe. No hay una revisión de Claude completada ni un modelo observado que atribuir; se solicitó Sonnet.

Mientras se esperaba el informe, se reprodujeron localmente y corrigieron dos casos: la cobertura ahora se comprueba por palabra para encontrar voz omitida dentro de una frase, y los tiempos interpolados no se colocan después de la palabra siguiente cuando el alineador devuelve solapamientos. Las palabras recuperadas se intercalan cronológicamente, conservando su idioma. Las tres regresiones añadidas fallaban con el comportamiento anterior y pasan con las correcciones. Estas correcciones son del host, no hallazgos atribuidos a Claude.

Para ampliar el catálogo, cada opción debe tener identificador estable, descripción comprensible, muestra fiel al resultado, implementación local, validación en ambos lenguajes y procedencia de sus recursos. Las opciones no implementadas no deben mostrarse como disponibles.
