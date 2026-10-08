# Pink Edition

Framework de edición de footage real con Remotion 4.0.534, captions sincronizados,
gráficos contextuales y efectos de sonido. Proyecto compartido entre Codex y Claude.

La demo de piscina dura 53.3s y conserva las 158 palabras de la transcripción
en orden. Quita pausas entre nueve intervenciones. Usa Inter Display Bold
a 100px uniformes y captions de hasta cuatro palabras. Siete tarjetas vectoriales
sobre vidrio acompañan frases concretas; hay un SFX al inicio, uno en cada corte
de toma y los de las tarjetas. Higgsfield no se usa en esta entrega.

## Instalar y abrir

Requisitos: Node 22, npm y FFmpeg. Para analizar material: Python 3.11,
WhisperX y Pillow (`requirements.txt`). El análisis procesa audio localmente.

```sh
npm ci
npm run setup:audio
npm run typecheck
npm run dev
```

`npm ci` prepara timelines ficticias únicamente si faltan. Un checkout nuevo
muestra esos ejemplos sobre un fondo; no contiene el video del cliente.
`npm run setup:audio` descarga los tres efectos públicos de Mixkit.
Los dos efectos Kenney CC0 y la licencia de Inter están incluidos.
Consultar `AUDIO_ASSETS.md` para procedencia y licencias.

## Archivos principales

- `src/FullDemo.tsx`: un grupo de imagen, voz y captions por toma del timeline.
- `src/EditorialGraphics.tsx`: monta cada tarjeta del config en su palabra.
- `src/graphics/cards.tsx`: las tarjetas vectoriales, una por `kind`.
- `src/LiquidGlass.tsx`: panel de vidrio que desenfoca y refracta el video.
- `src/SoundDesign.tsx`: SFX de inicio, de cada corte de toma y de tarjetas.
- `src/timeline.ts`: tipos del timeline y frame de cada palabra en el montaje.
- `full-demo-config.json`: fuente, tamaño, color, nombres de toma, tarjetas,
  ganancias y la palabra a la que se ancla cada gráfico y SFX.
- `scripts/prepare_full_demo.py`: alineación, remapeo y comprobación de cobertura.
- `scripts/finish_full_demo.py`: normalización en dos pasos y QC del MP4.
- `scripts/review_frames.py`: frames clave, hojas de contacto y avisos de captions.
- `CLAUDE.md` y `AGENTS.md`: contexto y reglas compartidas.

Los gráficos expresan lo dicho por el hablante; no añaden datos independientes.
Mantener márgenes para rostro y captions.

## Material local y preparación

Guardar el raw en `public/client/pool-raw-full.mp4` y el transcript Whisper con
`segments[].words[]` en `local/raw-transcript.json`. Ambas carpetas quedan fuera
de Git, junto con `src/pool-full-timeline.json` y `out/`.

```sh
python scripts/prepare_full_demo.py --source public/client/pool-raw-full.mp4 --transcript local/raw-transcript.json --allow-model-download
```

Con `--pages-only` se recalculan sólo los captions del timeline existente, sin
transcript ni alineación. Ninguna página termina en una palabra que la siguiente
taparía en menos de `min_last_word_frames`; esa palabra abre la página que sigue.
El flag `--allow-model-download` permite descargar el modelo de alineación. Se valida una palabra
alineada por cada palabra de entrada, sin selección temática.
Las tomas, sus trims y la duración total salen del timeline generado.
Cada gráfico y SFX se ancla con `anchor_word_id` y `offset_frames`; para un video
nuevo basta con apuntar esos anclajes a sus palabras. `sample_frame` sólo se usa
con los datos ficticios. Las correcciones ortográficas del transcript van en
`local/corrections.json` como `[{"index", "expected", "replacement"}]`.

## Exportar y verificar

```sh
npm run render:demo
python scripts/finish_full_demo.py --input out/piscina-demo-completa-graficos-sfx-v4-render.mp4 --output out/piscina-demo-completa-graficos-sfx-v4.mp4 --qc-prefix QC_graficos_sfx_v4
```

Entrega: 1080 × 1920, 30fps, H.264/AAC; objetivo -14 LUFS y pico -1.5 dBTP.
El raw recibido es 480 × 848; ampliar la salida no recupera detalle nativo.
El QC verifica cobertura, duración, formato, loudness y decodificación.
La aprobación visual y auditiva del cliente se registra por separado.

```sh
python scripts/review_frames.py
python scripts/review_frames.py --reference ruta/referencia.mp4 --reference-frames 60,207 --pairs 440:60
```

Genera en `out/review/` un frame por caption completo y tres por tarjeta, hojas de
contacto y `manifest.json` con avisos de palabras que casi no se ven y renglones
de una palabra. Con `--reference` añade frames de otro video y pares lado a lado.

## Colaborar con Claude

Clonar el repo privado con una cuenta autorizada, abrir su carpeta en Claude Code
y leer `CLAUDE.md`. Crear una rama por cambio y trabajar con commits pequeños.
No añadir footage, transcripts, credenciales o renders a un commit.
Los datos ficticios permiten revisar el código sin distribuir material del cliente.

Remotion mantiene su propia licencia; el repositorio no concede derechos
adicionales sobre el motor. [Licencia de Remotion](https://www.remotion.dev/license).
