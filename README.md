# Pink Edition

Framework de edición de footage real con Remotion 4.0.534, captions sincronizados,
gráficos contextuales y efectos de sonido. Proyecto compartido entre Codex y Claude.

La demo de piscina dura 53.3s y conserva las 158 palabras de la transcripción
en orden. Quita pausas entre nueve intervenciones. Usa Inter Display Bold
a 100px uniformes y captions de hasta cuatro palabras. Tres tarjetas acompañan
«uno de cada cuatro», «modo de emergencia» y «duplica»; seis SFX acompañan
su movimiento. Higgsfield no se usa en esta entrega.

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
`npm run setup:audio` descarga el whoosh público de Mixkit y lo prepara con FFmpeg.
Los dos efectos Kenney CC0 y la licencia de Inter están incluidos.
Consultar `AUDIO_ASSETS.md` para procedencia y licencias.

## Archivos principales

- `src/FullDemo.tsx`: nueve grupos editables de imagen, voz y captions.
- `src/EditorialGraphics.tsx`: tarjetas editoriales y entradas de sonido.
- `full-demo-config.json`: fuente, tamaño, color, tarjetas, ganancias y tiempos.
- `scripts/prepare_full_demo.py`: alineación, remapeo y comprobación de cobertura.
- `scripts/finish_full_demo.py`: normalización en dos pasos y QC del MP4.
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

El flag permite descargar el modelo de alineación. Se valida una palabra
alineada por cada palabra de entrada, sin selección temática.
Esta es la primera plantilla de piscina: al cambiar la estructura de un video,
actualizar trims y duraciones de `FullDemo.tsx` desde el plan generado.
Los tiempos de gráficos y SFX también deben ajustarse a las palabras del nuevo video.

## Exportar y verificar

```sh
npm run render:demo
python scripts/finish_full_demo.py --input out/piscina-demo-completa-graficos-sfx-v3-render.mp4 --output out/piscina-demo-completa-graficos-sfx-v3.mp4 --qc-prefix QC_graficos_sfx_v3
```

Entrega: 1080 × 1920, 30fps, H.264/AAC; objetivo -14 LUFS y pico -1.5 dBTP.
El raw recibido es 480 × 848; ampliar la salida no recupera detalle nativo.
El QC verifica cobertura, duración, formato, loudness y decodificación.
La aprobación visual y auditiva del cliente se registra por separado.

## Colaborar con Claude

Clonar el repo privado con una cuenta autorizada, abrir su carpeta en Claude Code
y leer `CLAUDE.md`. Crear una rama por cambio y trabajar con commits pequeños.
No añadir footage, transcripts, credenciales o renders a un commit.
Los datos ficticios permiten revisar el código sin distribuir material del cliente.

Remotion mantiene su propia licencia; el repositorio no concede derechos
adicionales sobre el motor. [Licencia de Remotion](https://www.remotion.dev/license).
