# 03 · Cómo resuelven CapCut, Submagic, Captions, Descript y OpusClip cinco problemas

## Método y límites

- **Verificado:** lo dice la documentación oficial, el centro de ayuda o la API del
  propio producto. Es lo que la empresa afirma; no lo medimos.
- **Observado:** lo medimos nosotros sobre archivos que tenemos (videos de referencia
  que el dueño trajo y nuestro propio render).
- **Hipótesis:** inferencia nuestra o dato de terceros sin confirmar.

No se descompiló, desofuscó ni interceptó ningún producto. No se llamó a ninguna API
privada. REA no se apuntó a estos productos: sus términos lo prohíben y el aviso legal
de REA limita su uso a software propio o autorizado.

## 1. Animación y efectos de subtítulos

| Producto | Qué hace | Evidencia |
| --- | --- | --- |
| Submagic | Resaltado palabra por palabra; plantillas por categorías (Trending, Premium, Emoji, Speakers, New); estilo propio guardable como «tema» (plan Pro); más de 100 idiomas; la API recibe `templateName` (ej. «Hormozi 2»). | Verificado: [care.submagic.co](https://care.submagic.co/en/category/fonts-captions-16gu1vw/), [docs.submagic.co](https://docs.submagic.co) |
| OpusClip | Subtítulos animados en más de 20 idiomas, plantillas animadas, emojis y resaltado automático de palabras clave. | Verificado (página oficial de precios): [opus.pro/pricing](https://opus.pro/pricing) |
| CapCut | «Auto Captions» desde Texto; pestaña de animación por clip; biblioteca de más de 6,000 plantillas. | Verificado: [ayuda de TikTok sobre CapCut](https://ads.tiktok.com/help/article/faqs-for-capcut?lang=en) |
| Descript | Agregar subtítulos como una edición de su asistente Underlord, también por API. | Verificado: [help.descript.com](https://help.descript.com/hc/en-us/articles/43370311322509-Descript-API) |
| Captions | Subtítulos automáticos (el producto lleva su nombre); estilos de edición con IA. | Hipótesis en el detalle; no encontramos documentación de sus parámetros |
| **Pink.ai hoy** | Un solo estilo: aparición por palabra con subida de 8 px, 100 px, máx. 4–5 palabras. Palabra activa sólo en los cortes de color. | Probado |

**Lectura:** el estándar del mercado es un *catálogo de estilos de subtítulos* con
**resaltado de palabra clave**. Nosotros tenemos uno solo. Es la brecha más visible.

## 2. Transiciones, zooms y efectos de sonido

| Producto | Qué hace | Evidencia |
| --- | --- | --- |
| Captions | «AI Zoom» en los momentos más atractivos; «AI Sound Effects» en momentos clave; estilos de edición (p. ej. «Vinyl», «Paper II») que aplican B-roll, transiciones y música. | Verificado: [ayuda de Captions/Mirage](https://help.mirage.app/platforms/android), [captions.ai](https://www.captions.ai/) |
| Submagic | Zoom automático en momentos emotivos, B-roll por contexto (Storyblocks), «Magic Transitions», efectos y música. | Hipótesis: fuentes de terceros; la API pública no documenta estos parámetros en su portada |
| Descript | Underlord agrega elementos visuales y genera B-roll. | Verificado: [help.descript.com](https://help.descript.com/hc/en-us/articles/43370311322509-Descript-API) |
| OpusClip | Reencuadre automático a 9:16, 1:1 y 16:9. | Verificado: [opus.pro/pricing](https://opus.pro/pricing) |
| CapCut | Transiciones y animaciones por clip, manuales o desde plantillas. | Verificado en lo general (ayuda de TikTok) |
| **Pink.ai hoy** | Sin zooms ni transiciones; efectos de sonido en cambios de toma, tarjetas y cortes de color. | Probado |

**Observado (medido con FFmpeg, umbral de escena 0.32):**

| Video | Duración | Cambios de plano | Cada |
| --- | --- | --- | --- |
| Referencia «Philipe AI» que trajo el dueño | 13.3 s | 6 | **2.2 s** |
| Nuestro v9 de piscina | 53.3 s | 9 | 5.9 s |
| Reel de interiores ya editado (subtítulos y fotos históricas) | 71.1 s | 3 | 23.7 s* |

\* El detector de escena no ve superposiciones ni fotos dentro de tarjetas; subestima
ese reel. Aun así, la referencia que le gusta al dueño cambia de plano **casi tres
veces más seguido** que nuestro v9: los zooms y transiciones son lo que da ese ritmo.

## 3. Edición mediante transcripción

| Producto | Qué hace | Evidencia |
| --- | --- | --- |
| Descript | Es su núcleo: borrar palabras del texto borra el video; quita muletillas y silencios. | Verificado: [descript.com](https://www.descript.com/video-editing) |
| CapCut (escritorio) | Modo de edición por transcripción y «Remove filler words». Posiblemente sólo en Pro. | Verificado el modo: [capcut.com](https://capcut.com/resource/edit-video-with-text). Plan Pro: hipótesis |
| Submagic | Quitar silencios. | Hipótesis (terceros) |
| OpusClip, Captions | No encontramos documentación de edición por texto. | Hipótesis (ausencia no confirmada) |
| **Pink.ai hoy** | El plan ya está anclado a palabras y el corte conserva cada palabra; no se puede borrar una palabra desde el editor. | Probado |

**Lectura:** tenemos la base (tiempos por palabra y montaje por tomas). Falta la
operación inversa: «quitar estas palabras» y recalcular las tomas.

## 4. Análisis de estilo a partir de videos de referencia

| Producto | Qué hace | Evidencia |
| --- | --- | --- |
| Ninguno de los cinco | No encontramos una función documentada que aprenda el estilo de un video de referencia. OpusClip acepta preferencias de curaduría (`curationPref`: duración, palabras clave, género), que no es estilo visual. | Verificado lo de OpusClip: [help.opus.pro](https://help.opus.pro/api-reference/endpoints/upload-video-create-project). Ausencia en los demás: hipótesis |
| invideo (fuera de la lista) | Afirma igualar ritmo, cortes, transiciones y música de una referencia. | Verificado como afirmación: [invideo.io](https://invideo.io/make/style-and-motion-reference/) |

**Lectura:** es la mayor oportunidad de diferenciación frente a los cinco.

## 5. Reutilización de preferencias editoriales

| Producto | Qué hace | Evidencia |
| --- | --- | --- |
| Submagic | Varios *Brand Kits* (logos, colores, fondos, plantillas); temas de subtítulos propios; *Presets* que agrupan tema, gancho, logo y música, editables sólo en su editor. | Verificado: [care.submagic.co](https://care.submagic.co/en/article/how-to-use-brand-kit-in-submagic-16031pe/), [docs.submagic.co](https://docs.submagic.co/api-reference/update-preset.md) |
| OpusClip | Plantillas de marca (1 en Starter, 2 en Pro); la API recibe `brandTemplateId`. | Verificado: [opus.pro/pricing](https://opus.pro/pricing), [help.opus.pro](https://help.opus.pro/api-reference/overview) |
| Descript | *Brand Studio*: diseños, fuentes y colores para todo el equipo. | Verificado: [descript.com](https://www.descript.com/video) |
| CapCut | Plantillas; no confirmamos un «brand kit» con nombre. | Hipótesis |
| Captions | Elegir un estilo de edición con IA. | Verificado como estilo; aprendizaje por usuario: no encontrado |
| **Pink.ai hoy** | Cuestionario de estilo por cuenta: tema, estilo, gráficos, color de marca, sonido, nota. | Probado |

**Lectura:** todos guardan *preferencias declaradas* (kits, plantillas). Ninguno
documenta **aprender de las correcciones** del creador. Ahí está la segunda oportunidad.

## APIs oficiales disponibles

| Producto | API | Estado | Evidencia |
| --- | --- | --- | --- |
| Submagic | REST (`POST /v1/projects`, plantillas, webhooks; 50 exportaciones por hora) | Pública | [docs.submagic.co](https://docs.submagic.co) |
| OpusClip | REST (`/api/clip-projects`, plantillas de marca, webhooks) y servidor MCP | Planes Pro (beta), Max y Business | [help.opus.pro](https://help.opus.pro/api-reference/overview) |
| Descript | REST (importar, transcribir, ediciones de Underlord) | Beta / acceso anticipado; no descarga el render sin publicarlo | [help.descript.com](https://help.descript.com/hc/en-us/articles/43370311322509-Descript-API) |
| Captions, CapCut | No encontramos API pública de edición | Hipótesis | — |

Uso recomendado de estas APIs: **como referencia de calidad** (exportar el mismo video
y comparar), no como motor de Pink.ai, para no depender de un competidor ni pagarle por
video.

## Lo que falta para pasar de «Verificado» a «Observado»

Exportar un mismo video corto desde las cuentas que el dueño tenga (Submagic y CapCut
tienen planes gratuitos) y medir con nuestras herramientas: ritmo de cortes, frecuencia
de zooms, tamaño y posición de subtítulos, y efectos de sonido por minuto.
