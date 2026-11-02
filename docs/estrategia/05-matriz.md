# 05 · Matriz de oportunidades

Escala 1 a 5. **Complejidad**: 1 = un par de días, 5 = semanas con riesgo técnico.
**Costo**: de operar por video (cómputo, APIs), no de construir. **Calidad**: cuánto
mejora el video que recibe el creador. **Diferenciación**: qué tanto nos separa de los
cinco competidores (ver `03-competidores.md`). Las cifras son criterio del arquitecto,
no mediciones, salvo donde se indica.

| Función | Construir dentro | API o biblioteca | Recomendación | Compl. | Costo | Calidad | Difer. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Primera edición automática (plan) | Claude + reglas fijas (ya escrito) | Submagic/OpusClip API como motor | **Dentro**: es el corazón y ya está hecho; las APIs ajenas nos quitan el control del estilo | 2 | Bajo (una llamada por video) | 5 | 4 |
| Presets de subtítulos (resaltado de palabra clave, karaoke, entrada por palabra) | Remotion, parámetros de STYLE | Plantillas ajenas no son integrables | **Dentro** | 2 | Nulo | 5 | 3 |
| Palabra clave resaltada elegida por IA | Claude marca palabras en el plan | — | **Dentro**, junto con la propuesta | 2 | Bajo | 4 | 3 |
| Zooms automáticos en énfasis | Remotion + encuadre del rostro desde el recorte que ya existe | — | **Dentro** | 3 | Nulo | 4 | 3 |
| Transiciones en cambios de toma, con su sonido | Remotion | — | **Dentro** | 2 | Nulo | 3 | 2 |
| Edición por transcripción (borrar palabras → recortar) | El montaje ya es por palabras | — | **Dentro** | 3 | Nulo | 4 | 3 |
| Quitar muletillas («eh», «este», «o sea») | Lista por idioma sobre la transcripción | API de transcripción que conserva muletillas | **Probar ambas**: WhisperX tiende a omitirlas; si no aparecen en el texto no se pueden quitar | 3 | Bajo–medio | 4 | 2 |
| Estilo desde un video de referencia | FFmpeg (escenas, energía de audio) + Claude con visión sobre cuadros | — | **Dentro**: ninguno de los cinco lo documenta | 4 | Bajo | 4 | 5 |
| Aprendizaje de preferencias por correcciones | Diferencias entre propuesta y versión guardada | — | **Dentro**: nadie lo documenta | 3 | Nulo | 4 | 5 |
| Transcripción más precisa | WhisperX con modelo mayor (más lento en CPU) | API de transcripción (Deepgram, AssemblyAI u otra) | **Evaluar con 3 videos**: comparar errores y tiempo; precio por minuto a confirmar | 2 | Bajo–medio | 4 | 1 |
| Recorte de persona más rápido | Modelo ligero (p. ej. `mobilenetv3` de RVM ya disponible) | GPU por uso en la nube | **Probar `mobilenetv3` primero** (cero dependencias nuevas); GPU después | 2 | Nulo / medio | 3 (tiempo) | 1 |
| B-roll de stock | — | API de banco de imágenes con licencia clara | **API**, cuando el catálogo de tarjetas no alcance; cuidar licencias | 3 | Bajo–medio | 3 | 2 |
| Cola de trabajos y varios videos a la vez | Cola local y en la nube (ya existe en la nube) | — | **Dentro** | 2 | Nulo | 2 (operación) | 1 |
| Vista previa en iPhone | Versión HEVC con transparencia del recorte | — | **Dentro** | 2 | Nulo | 3 (en celular) | 1 |
| Música | — | — | **Fuera de alcance** por decisión del dueño (se agrega al publicar) | — | — | — | — |

## Qué construir primero

Las filas con calidad 4–5 y complejidad 2–3 que no dependen de terceros: presets de
subtítulos, zooms y transiciones, edición por transcripción. Las de diferenciación 5
(estilo desde referencia, aprendizaje) son las que justifican el producto frente a los
cinco, pero rinden más cuando la primera edición automática ya funciona.
