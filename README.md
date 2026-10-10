# Pink Edition / Pink.ai

Framework de edición de footage real con Remotion 4.0.534, captions sincronizados,
gráficos contextuales y diseño sonoro. La demo de piscina conserva las 158
palabras en orden y sólo recorta tramos sin habla entre nueve intervenciones.

## Instalar y abrir

Requisitos: Node 22, npm y FFmpeg. Python 3.12 en dos entornos, porque WhisperX
fija su propio torch: `.venv-asr` (`requirements-asr.txt`) transcribe y alinea;
`.venv` (`requirements.txt`) recorta a la persona, coloca tarjetas y verifica.
Todo el análisis se ejecuta localmente.

```sh
npm ci
npm run setup:audio
npm run typecheck
npm run dev
```

Un checkout sin medios del cliente usa datos ficticios. Los videos, transcripts,
timelines reales y renders permanecen locales. `AUDIO_ASSETS.md` documenta la
procedencia y licencia de los efectos.

## Contrato de edición

`src/FullDemo.tsx` registra `PinkEdit` y el alias `PoolFullDemo`. La composición
recibe `{style, plan, timeline, media}`; `src/edit.ts` crea el contexto compartido
y resuelve los anclajes de palabras.

- `style/pink-demo-v1.json`: STYLE fijo del look: formato, montaje, captions,
  temas, fondos, vidrio, movimiento y reglas de audio.
- `projects/piscina/plan.json`: PLAN del video: nombres de toma, cortes de color,
  tarjetas y fondos.
- `schema/edit-plan.schema.json`: contrato estructural del PLAN.
- `docs/EDITING_GUIDELINES.md`: reglas editoriales y límites comprobables.

El plan de piscina activa seis tarjetas. El registro de
`src/graphics/cards.tsx` ofrece siete `kind`, incluido `illness`. Los captions
usan Inter Display Bold a 100 px, normalmente hasta cuatro palabras; STYLE
permite cinco en habla rápida para evitar una última palabra demasiado fugaz.

Los gráficos se ligan a frases concretas. Hay cortes de color, fondos temáticos
y temas contextuales azul, verde y rojo. `src/SoundDesign.tsx` deriva desde
STYLE los sonidos de inicio, fronteras de toma, entradas y énfasis de tarjetas y
cortes de color; el PLAN no enumera SFX. Pink.ai no incluye música: se agrega al publicar.

## Web

```sh
npm run web   # http://localhost:3000
```

- **Inicio:** subir un video y ver en qué paso va cada trabajo.
- **Editor:** vista previa en vivo con la misma composición `PinkEdit`,
  transcripción clicable y, por frase, cortes de color, tarjetas y fondos con su
  color. Línea de tiempo con tres carriles: arrastrar un bloque lo mueve (se
  vuelve a anclar a la palabra más cercana), su borde derecho cambia la
  duración. Deshacer y rehacer (⌘Z, ⇧⌘Z), espacio para reproducir, flechas para
  avanzar un segundo, Supr para borrar el bloque elegido. Guardar crea una
  versión del plan y recoloca las tarjetas sobre la persona; renderizar lanza
  `scripts/pink_edit.py` y muestra el avance por pasos.
- **Celular:** por debajo de 900 px la vista previa queda fija arriba y el resto
  va en pestañas (Texto, Elementos, Tiempo). La web es instalable (PWA):
  `app/manifest.ts`, íconos en `public/icons/`, botón «Instalar la app» en `/app`.
- **Proponer con IA:** pide el plan a la API de Claude a partir de la
  transcripción. Requiere `ANTHROPIC_API_KEY` en `.env.local`.

La web (`app/`, Next.js) tiene dos modos:

- **Local** (por defecto): corre en la misma máquina que el motor, procesa un video
  a la vez y lee y escribe `work/<id>/`. Sin cuentas.
- **Nube**: con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  exige entrar con un enlace por correo, sube los videos a Supabase y encola los
  trabajos. Un procesador en el equipo que edita (`python3 scripts/worker.py`, con
  `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`) los toma de la cola. Plantilla en
  `pink.env.example`; autoarranque en `scripts/worker.launchd.plist.example`.
  `worker.py --local-queue <carpeta>` ejecuta el mismo flujo sin Supabase.

En Vercel sólo corre la web: sin procesador, subir y renderizar no funcionan.

## Editar un video

```sh
python3 scripts/pink_edit.py ruta/al/video.mp4 --plan ruta/al/plan.json
```

Encadena todos los pasos y deja el MP4 y su QC en `work/<id>/out/`: lleva el
fuente a 30 fps, transcribe, corta silencios y pagina captions, recorta a la
persona, coloca las tarjetas, renderiza `PinkEdit` y normaliza el audio. Sin
`--plan` usa un plan vacío: captions y sonidos de corte de toma. Los pasos ya
hechos (transcript, recorte) se reutilizan. `work/` y `public/work/` quedan
fuera de Git.

## Preparar la demo paso a paso

El raw y el transcript Whisper con `segments[].words[]` se guardan fuera de Git.
Las correcciones ortográficas usan el formato
`[{"index", "expected", "replacement"}]`.

```sh
python3 scripts/prepare_full_demo.py \
  --source public/client/pool-raw-full.mp4 \
  --transcript local/raw-transcript.json \
  --corrections local/corrections.json \
  --style style/pink-demo-v1.json \
  --plan projects/piscina/plan.json
```

`--pages-only` recalcula únicamente las páginas del timeline. El script conserva
todas las palabras y valida contra ellas los anclajes del PLAN cuando éste existe.
No usar `--allow-model-download` salvo autorización expresa.

`scripts/make_matte.py` genera el recorte de la persona. Después,
`scripts/place_graphics.py` calcula la posición vertical de las tarjetas a partir
del matte; sus avisos requieren revisión visual.

## Exportar y verificar

```sh
npm run render:demo
python3 scripts/finish_full_demo.py \
  --input out/piscina-demo-render.mp4 \
  --output out/piscina-demo.mp4 \
  --qc-prefix QC_piscina_demo
python3 scripts/review_frames.py
```

La entrega objetivo es 1080 × 1920, 30 fps, H.264/AAC, −14 LUFS y pico de
−1.5 dBTP. El QC técnico comprueba formato, duración, cobertura, loudness y
decodificación; la aprobación visual y auditiva es independiente.
La revisión extrae una muestra por caption y fondo temático, y tres por tarjeta.

`PINK_AI.md` describe la evolución a plataforma. `supabase/migrations/` contiene
las migraciones de datos. No añadir footage, transcripts, credenciales ni renders
a Git; trabajar en una rama propia y preservar los cambios de otros.

Remotion conserva su propia licencia: [licencia de Remotion](https://www.remotion.dev/license).
