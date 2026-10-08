# Pink.ai: reglas de edición y contrato STYLE / PLAN

Este documento describe el look v9 y su separación en STYLE y PLAN, ya aplicada: `style/pink-demo-v1.json` y `projects/piscina/plan.json` sustituyen al antiguo `full-demo-config.json`.
Fuentes: ese config, `src/{FullDemo,EditorialGraphics,ColorCuts,BackgroundEffects,SoundDesign,LiquidGlass}.tsx`, `src/edit.ts`, `src/graphics/cards.tsx`, `scripts/{prepare_full_demo,place_graphics,make_matte}.py`, `CLAUDE.md`, `AGENTS.md`, `README.md`, `PINK_AI.md` y `../METODOLOGIA.md`.
El plan de piscina tiene **seis tarjetas activas**; el registro contiene siete clases, incluida `illness`, actualmente sin evento.

## Separación y migración

**STYLE** fija la apariencia y política reutilizable por look: tipografía, paginación, paleta, vidrio, layout, movimiento, blur, recursos y mezcla de SFX. **PLAN** selecciona momentos y significados para cada video. El timeline alineado conserva palabras, trims y procedencia por separado: `cuts` en el plan significa cortes de color, no cortes de toma.

`schema/edit-plan.schema.json` es el contrato del JSON editable. `style` identifica el look (`pink-demo-v1`); `version` identifica una versión positiva del plan. Las decisiones se validan antes del render determinista; no se consulta un LLM por frame.

| Ruta en el antiguo `full-demo-config.json` | Destino y criterio |
| --- | --- |
| `fps`, `width`, `height` | STYLE: 30, 1080, 1920; la composición los toma del estilo. |
| `edit` | Contenedor mixto, no se copia entero. |
| `edit.mode`, `speech_padding_before_seconds`, `speech_padding_after_seconds`, `minimum_pause_to_remove_seconds`, `alignment_window_padding_seconds` | STYLE/política de preparación: `all_speech_original_order`, 0.22, 0.28, 0.8 y 0.6 s. No son decisiones de selección narrativa. |
| `edit.clip_labels` | PLAN → `clip_labels`, por índice de toma. |
| `captions.font_family`, `font_file`, `font_size`, `font_weight`, `letter_spacing_em`, `word_gap` | STYLE: InterDisplay, InterDisplay-Bold.ttf, 100, 700, −0.075, 18. |
| `captions.max_width`, `max_words`, `max_words_fast_speech`, `max_lines`, `min_last_word_frames` | STYLE: 864 px, 4, 5, 2, 8 frames. |
| `captions.line_height`, `top`, `color`, `shadow`, `reveal_frames`, `lift_pixels` | STYLE: 112, 1190, blanco, sombra del config, 5 frames y 8 px. |
| `themes.{base,health,stress}.{accent,light,dark}` | STYLE: paletas azul, verde y roja del config; PLAN sólo selecciona la clave `theme` por evento. |
| `intro_blur.{pixels,hold_frames,release_frames}` | STYLE: 22, 18, 24; PLAN admite override completo opcional con los mismos nombres. |
| `background` | Contenedor mixto. |
| `background.{dim,saturate,blur,points,link_distance,fade_frames}` | STYLE: rgba(8,22,56,0.46), 0.55, 5, 64, 190, 10. |
| `background.events` | PLAN → `backgrounds`. |
| `cuts` | Contenedor mixto; el PLAN usa un array. |
| `cuts.{paper,solid}.{background,ink,muted}` | STYLE. `ColorCuts` sustituye `paper.ink` y `solid.background` según el tema. |
| `cuts.events` | PLAN → `cuts`. |
| `audio` | Contenedor mixto. |
| `audio.{integrated_lufs,true_peak_dbtp,loudness_range}` | STYLE/entrega: −14 LUFS, −1.5 dBTP, 11. |
| `audio.music` | PLAN → `music`: null o **un objeto**, no array, según `SoundDesign`. `file`, `title`, `gain_db`, `fade_in_frames`, `fade_out_frames` se conservan. |
| `audio.intro_sfx.{file,gain_db,trim_before_frames,duration_frames}` | STYLE: air-zoom-2608.wav, −12 dB, 10, 24. |
| `audio.cut_sfx.{gain_db,skip_near_card_frames,sounds}`; `sounds[].{file,peak_frames,duration_frames}` | STYLE: −12 dB, 6 frames; sweep-166.wav (9/23), swoosh-3115.wav (4/17). Son fronteras de toma. |
| `audio.sfx` | Mixto heredado: no se copió al PLAN; `SoundDesign` deriva esos sonidos de tarjetas y cortes desde STYLE. |
| `audio.sfx[].{file,gain_db,duration_frames}` | STYLE → `audio.card_enter_sfx` glass_001.ogg (−14 dB, 10); `audio.card_beat_sfx` glass_005.ogg (−16 dB, 8); `audio.color_cut_sfx` swoosh-3115.wav (−12 dB, 17). |
| `audio.sfx[].{id,label,anchor_word_id,offset_frames,sample_frame}` | Datos duplicados de eventos/beat, ahora derivados; para corte de color, offset visual menos `color_cut_sfx.lead_frames` (4). No se admiten SFX por tarjeta en el esquema. |
| `graphics` | Contenedor mixto. |
| `graphics.{left,width,height,radius,ink,muted,enter_frames,exit_frames,enter_offset}` | STYLE: 190, 700, 250, 62, blanco, rgba(255,255,255,0.36), 12, 9, 26. |
| `graphics.glass.{blur,saturate,brightness,tint,refraction,rim_pixels,halo,halo_pixels,sheen_frames}` | STYLE: 9, 1.7, 1.05, rgba(18,20,26,0.32), 72, 46, 0.3, 38, 16. |
| `graphics.events` | PLAN → `cards`. |
| Eventos visuales: `id`, `label`, `theme`, `anchor_word_id`, `offset_frames`, `duration_frames` | PLAN, sin renombrar. `label` es metadato, no texto alternativo de la voz. |
| Cortes: `style`, `last_word_id` | PLAN; `paper`/`solid` y última palabra inclusiva. |
| Tarjetas: `kind`, `top`, `meaning`, `beat.{anchor_word_id,offset_frames}` | PLAN: catálogo, posición calculada por video, justificación y énfasis. `meaning` se conserva como opcional. |
| Fondos: `motif` | PLAN: `network`, `rings`, `crosses`. |
| Eventos y `beat`: `sample_frame` | PLAN opcional, sólo fallback de desarrollo. Nunca fuente temporal del video real. |

También pertenece a STYLE lo que sigue incrustado en componentes: curvas, escalas, geometría y tiempos internos de pictogramas, fade final de SFX de 4 frames, gradiente bajo captions y constantes del algoritmo de colocación. No se extrae automáticamente con este esquema.

## Reglas comprobables

- Conservar todas las palabras, muletillas y repeticiones habladas en orden; comparar la lista de IDs antes y después. Sólo cortar silencios entre tomas y extremos sin habla, con márgenes protegidos. La separación usa pausas **mayores que** 0.8 s; no elimina necesariamente toda la pausa por los márgenes.
- Captions: Inter Display Bold, 100 px uniformes, revelado por palabra, hasta 2 líneas y normalmente 4 palabras; admitir 5 sólo para evitar una última palabra visible menos de 8 frames. El paginador usa penalizaciones (100 por frame faltante, 50 por página extra larga), no una garantía dura: revisar excepciones y legibilidad, sin reducir la fuente.
- Tarjeta: debe ilustrar una frase concreta y justificarla con `meaning`; anclar entrada y énfasis a sus palabras. Catálogo real: `patients`, `emergency`, `risk`, `illness`, `body`, `healing`, `bill`. Las cuatro personas o el 2× sólo corresponden a lo dicho; no son evidencia independiente. `healing` recibe `beat` pero su animación usa la duración.
- Corte de color: usar una frase hablada que merezca énfasis textual autónomo. Mostrar exactamente el rango inclusivo `anchor_word_id`–`last_word_id`, en mayúsculas, con la palabra actual destacada; el código elimina puntuación. Criterio operativo **propuesto**, pendiente de validar: `paper` para explicación/reflexión y `solid` para advertencia enfática, siguiendo los ejemplos `investigate`/`doctor` y `illness`/`designed`. No existe selector semántico automático.
- Tema: `health` para salud, médico y sanar; `stress` para estrés, emergencia, enfermedad como amenaza y riesgo; `base` para contexto general/reflexión. Contrastar contra lo dicho, no sólo palabras aisladas: `sick_bg` es verde y `illness` rojo en el config. Revisar ambigüedades editorialmente. No hay pista global de tema ni recoloreado automático de captions; se elige por evento.
- Resolver cada evento visual con `frame(palabra) + offset_frames`, y el `beat` del mismo modo. Verificar IDs existentes, rango de corte ordenado, frames dentro del montaje, énfasis dentro de tarjeta y IDs de evento únicos. `sample_frame` no sirve para estas comprobaciones reales.
- No solapar tarjeta con corte de color ni asignar las mismas palabras a dos énfasis principales. Son reglas de aceptación del nuevo PLAN, **no validaciones existentes**. Usar intervalos semiabiertos de frames: terminar justo cuando empieza el siguiente no solapa. Los fondos de apoyo pueden acompañar la misma frase: `emergency_bg` y `risk_bg` comparten anclaje con sus tarjetas; prohibir toda coincidencia rompería v9. Falta decidir si se mantiene esa excepción.
- **Densidad propuesta, no comportamiento actual:** máximo 4 entradas visuales en cualquier ventana de 10 s (300 frames); contar cortes, tarjetas y fondos, sin captions ni SFX derivados. Separación mínima propuesta entre el final y la siguiente entrada de énfasis principal: 8 frames (valor tomado del umbral de legibilidad, aún no validado para este uso). Fondos coordinados quedan fuera de esa separación. No imponer una cuota mínima ni un cambio cada cuatro segundos. El contacto `patients` → `doctor` del fallback deja 0 frames y no cumpliría la propuesta de 8.
- **Duraciones:** no hay mínimos editoriales implementados. Mínimos observados en el config: corte 25, tarjeta 43 y fondo 66 frames; se proponen como pisos iniciales a validar, no garantía de lectura. Además, conservar la frase completa y revisar énfasis/salida: vidrio entra en 12 y sale en 9; fondos funden 10 por extremo. El esquema exige sólo duración positiva; estas condiciones dependen de STYLE y timeline.
- Colocación: `place_graphics.py` busca el punto más alto de la persona durante toda la tarjeta, dentro de sus columnas, y calcula `top = highest − 70 − 250`. Usa alfa >96 y mínimo `top=150`; si no cabe, avisa y fuerza 150, **sin garantizar el hueco**. Revisar también movimiento del panel, halo, rostro y captions; el rectángulo calculado no certifica todos esos márgenes. Nunca poner gráficos contextuales delante del cuerpo. Los cortes de color son reemplazos completos del plano, no tarjetas sobre la persona.
- Prohibido inventar cifras, trazados clínicos, ECG o CTA no grabado; reutilizar audio procedural rechazado, alterar el discurso o tapar rostro/captions con tarjetas. Animar con frames de Remotion, no con reloj CSS. Conservar procedencia/licencias y versiones anteriores; no subir material privado, transcripts, claves ni entornos.

## Capas y sonido

Orden de `FullDemo.tsx`, de fondo a frente:

1. Video original por toma, con voz y trims compartidos.
2. Fondo temático: dim/desaturación/blur del fondo y motivo animado.
3. Tarjetas liquid glass y pictogramas.
4. Persona con alfa, muda, con los mismos trims: ocluye fondos y tarjetas.
5. Gradiente de lectura y captions.
6. Corte de color opaco: reemplaza visualmente todo lo anterior con la frase.
7. `SoundDesign`, sin capa visual: añade música y SFX; la voz sigue en el video original.

El blur de apertura cubre todo el plano del grupo visual (capas 1–4), con 22 px durante 18 frames y resolución en 24: 42 frames = 1.4 s. **No desenfoca captions ni cortes de color**, que están fuera del grupo. El filtro desaparece al llegar a cero para no interferir con el vidrio.

Hay un SFX inicial y uno por frontera entre tomas, salvo si una tarjeta entra a ≤6 frames: el código omite ese barrido. Los sonidos de entrada/énfasis de tarjetas y barridos de color se derivan de STYLE y los anclajes del PLAN. Excepción conservada: `healing` tiene `beat` pero no sonido de énfasis; está en `audio.card_beat_sfx.silent_kinds`. Cambiarla exige escucha. Los recursos, ganancias, duraciones y fades deben quedar explícitos en el plan de audio derivado, con su procedencia (`AUDIO_ASSETS.md`).

Música: null por defecto, o un objeto con los campos que ya consume `SoundDesign`; no varias pistas. Se extiende por la composición con fades relativos a sus extremos. No incrustar canciones con derechos sin autorización para clientes; usar licencia adecuada o añadir música al publicar. La apertura, la música y los SFX de frontera son excepciones estructurales al anclaje por palabra, no eventos absolutos introducidos por el LLM.

## Pipeline previsto

| Paso | Entrada → salida; estado actual |
| --- | --- |
| Transcribir | Video local → transcript con `segments[].words[]` (`scripts/transcribe.py`, WhisperX local). Las palabras que no se alinean, como cifras, conservan un tiempo repartido entre sus vecinas. |
| Alinear y cortar silencios | Raw + transcript + política STYLE → palabras alineadas, tomas con trims/IDs, páginas, cobertura y SRT. WhisperX local; comprobar mismo número, texto y orden. Salidas: el timeline (`--timeline`), su copia `full-demo-edit-plan.json` (timeline, no este PLAN) y el SRT en `--out-dir`. |
| Matte | Raw → WebM con alfa, mismo tamaño/cadencia del raw; `make_matte.py` usa Robust Video Matting local y estado entre frames. |
| Proponer plan | Transcript alineado + catálogo STYLE → JSON conforme al esquema; luego revisión editorial/UI y validación semántica. La propuesta automática sigue pendiente; el motor ya consume el plan. |
| Colocar tarjetas | PLAN + timeline + alfa + layout STYLE → `top` por tarjeta y avisos de falta de espacio. El script escribe `top` en el plan y mide el tamaño del recorte; `top` es opcional en el esquema hasta este paso. |
| Renderizar | Plan aprobado + STYLE + timeline + fuente/matte/recursos → MP4 Remotion. `PinkEdit` recibe `{style, plan, timeline, media}` por `--props`; ejecutar TypeScript antes de una entrega. |
| QC técnico | MP4 + cobertura/timeline → verificación de duración, 1080 × 1920, 30 fps, H.264/AAC, −14 LUFS, pico −1.5 dBTP y decodificación completa; `finish_full_demo.py` normaliza y verifica. |
| Revisar frames y escucha | MP4 → frames de captions y tarjetas, hojas de contacto/avisos de `review_frames.py`, revisión audiovisual y aprobación estética separada del QC. |

## Límites y decisiones abiertas

- ¿Qué hacer si no cabe la tarjeta sobre la cabeza? El clamp actual no resuelve el conflicto; tampoco están validados varios sujetos, movimiento de cámara o matte difícil.
- ¿Cómo tratar idiomas distintos del español, palabras demasiado largas y otras relaciones de aspecto? Idioma, prefijo de IDs y dimensiones ya son parámetros, pero sólo están probados con el video de piscina en español.
- Validar densidad, separación, duraciones y excepción de fondos coordinados con más videos; no hay detector de conflictos ni rango `last_word_id` para tarjetas/fondos. Sus palabras ocupadas deberán inferirse del intervalo y revisarse.
- Acordar criterio semántico de `paper`/`solid`, temas ambiguos y nuevos temas/tarjetas; el catálogo actual no cubre cualquier asunto.
- Resolver la regla estricta de 4/5 palabras frente al optimizador y confirmar aprobación de oído de SFX. `PINK_AI.md` mantiene ambos pendientes; no confundir el look v9 de referencia con aprobación de cada detalle de audio.
- Definir catálogo versionado de STYLE y política de versiones del PLAN. El motor consume el plan pero no lo valida contra el esquema al renderizar; `sample_frame` es opcional y sólo se usa con datos ficticios.
- Validar música/licencias y combinación de fades con duración del video; el esquema no prueba derechos ni rangos temporales cruzados. Decidir alcance del override de blur y si debe incluir captions.
- Definir duración máxima de entrada y probar otros videos, como exige `PINK_AI.md`. No asumir que QC técnico demuestra calidad estética.

La validación JSON es sólo estructural: no puede resolver IDs contra otro documento, medir huecos del matte ni aprobar las afirmaciones del hablante. Los mínimos de enteros del esquema son restricciones nuevas de integridad (duraciones positivas, posiciones/frames de muestra no negativos); los offsets admiten signo. No se añaden umbrales estéticos al esquema hasta validarlos.
