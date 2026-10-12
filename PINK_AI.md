# Pink.ai — análisis previo al desarrollo

Fecha: 8 de octubre de 2026. Pink.ai es la plataforma donde se sube un reel o
TikTok y sale editado con el estilo de la demo de piscina (v9). Primera versión:
sólo para Santiago, con un editor para ajustar la propuesta antes de renderizar.

## Estado de partida

| Pieza | Estado |
| --- | --- |
| Estilo de la demo (captions, cortes de color, tarjetas de vidrio, fondos, SFX) | Funciona; el motor `PinkEdit` acepta cualquier video con `scripts/pink_edit.py` (punto 1 hecho) |
| Repositorio | `santirosado21-spec/pink-edition`, rama `claude/data-driven-review` |
| Base de datos | Supabase `pink-ai` (`awptxbhlraiddimobwzv`, us-east-2), esquema en `supabase/migrations/` |
| Servidor | VPS Hostinger KVM 1; Santiago lo actualiza |
| Procesador | La Mac de Santiago (15 min por video de 53 s) |

## Base de datos

- `videos`: lo subido, su dueño y su estado (`uploaded` → `processing` →
  `ready_to_edit` → `rendering` → `done`).
- `transcripts`: palabras con tiempos.
- `edit_plans`: config y timeline de una edición; cada ajuste es una versión nueva.
- `jobs`: cola (`analyze`, `render`); `claim_next_job()` entrega uno a la vez.
- `renders`: MP4 entregados con su QC.
- Buckets privados `sources` y `renders`, con carpeta por usuario.
- Cada tabla tiene RLS: cada quien ve sólo lo suyo. El procesador usa la clave de
  servicio, que nunca va al navegador.

## Lo que falta, en orden

### 1. Que el motor edite cualquier video — hecho

- `PinkEdit` recibe `{style, plan, timeline, media}`; ya no hay rutas ni
  decisiones del video de piscina en el código.
- El antiguo `full-demo-config.json` quedó partido en `style/pink-demo-v1.json`
  (el look) y un plan por video que sigue `schema/edit-plan.schema.json`; es lo
  que se guarda en `edit_plans`. Reglas en `docs/EDITING_GUIDELINES.md`.
- `scripts/pink_edit.py <video>` encadena transcribir, cortar silencios, recortar
  a la persona, colocar tarjetas, renderizar y QC en `work/<id>/`.
- Probado sólo con el raw de piscina: sin plan (captions y sonidos de corte) y con
  el plan del v9 sin posiciones de tarjeta. La transcripción automática dio las
  mismas 158 palabras, con una distinta que se arregla con el archivo de
  correcciones. Falta probarlo con otro video, otra cámara y otro tema.

### 2. Propuesta editorial automática

Lo que hoy decide una persona, por video:

- Qué frases llevan corte de color y con qué estilo.
- Qué tarjeta acompaña a qué frase y en qué palabra entra.
- El tema de color de cada momento (base, salud, estrés…).
- Qué fondo va detrás de la persona.

Se resuelve con una llamada a la API de Claude que recibe el transcript y el
catálogo, y devuelve el plan en JSON validado contra un esquema. Reglas que debe
respetar: sólo lo dicho, ninguna cifra inventada, sin CTA no grabado.

### 3. Catálogo de gráficos genéricos

Las seis tarjetas actuales sólo sirven para el tema de estrés. Hace falta un
catálogo que funcione con cualquier tema: proporción (N de M), multiplicador,
comparación de dos barras, lista, antes → después, alerta, progreso. Y una tabla
de temas de color más amplia (dinero, salud, peligro, tecnología).

### 4. Editor

- Web con Next.js; vista previa con `@remotion/player`, que reproduce la edición
  en el navegador sin renderizar.
- Lista de frases del transcript; por frase se elige corte de color, tarjeta,
  tema y fondo. Guardar crea una versión en `edit_plans`.
- Botón de render: inserta un `job`; el estado se ve en vivo con Supabase Realtime.
- La vista previa necesita el video fuente y el recorte de la persona accesibles
  desde el navegador (URLs firmadas del bucket).

### 5. Procesador

- Programa en la Mac que llama `claim_next_job`, descarga el fuente, ejecuta el
  motor, sube el MP4 y marca el trabajo. Reintentos y registro de errores.
- Autoarranque con `launchd` para que sobreviva reinicios.

### 6. Servidor (a cargo de Santiago)

- Node 22, proxy con HTTPS y dominio.
- Variables de entorno: URL y clave publicable de Supabase para la web; la clave
  de servicio y la de Anthropic sólo en el procesador.
- Límite de subida del proxy acorde al tamaño de los videos.

## Riesgos y decisiones abiertas

- **Calidad con otros videos:** todo está probado con un solo video. Hace falta
  un segundo y tercer video de otros temas antes de confiar en la propuesta
  automática.
- **Recorte de la persona:** depende de la GPU de la Mac. Varias personas en
  cuadro, cámara en movimiento o fondos difíciles no están probados.
- **Colocación de tarjetas:** hoy van arriba de la cabeza. Si la persona ocupa
  todo el alto del cuadro no hay sitio; falta una regla de respaldo.
- **Duración:** un video de 53 s tarda 15 min. Un video de 3 min tardará cerca
  de una hora; definir un máximo.
- **Música:** fuera del producto por decisión del 10 de octubre de 2026; se
  agrega al publicar.
- **Licencia de Remotion:** gratis para individuos y empresas de hasta tres
  personas; por encima requiere licencia de empresa.
- **Sonido:** los SFX y sus volúmenes siguen sin aprobarse de oído.
- **Regla de 4 o 5 palabras por página:** pendiente desde el v5.

## Estado al 9 de octubre de 2026

Hecho y probado:

- Motor `PinkEdit` y comando único `scripts/pink_edit.py`; límites de 120 s de
  material y 500 MB (`style/pink-demo-v1.json`).
- Catálogo de 13 tarjetas (6 sin tema) con campo `text` sólo para cifras dichas.
- Web local (`npm run web`): subida, estado, editor con vista previa, versiones
  de plan, render y descarga.
- Modo nube (código en `app/_lib/cloud.ts`, `proxy.ts`, `/login`): se activa con
  `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Sin ellas
  la web sigue en modo local.
- Segunda migración (`supabase/migrations/…cloud_mode.sql`) y prueba de seguridad
  de 12 comprobaciones sobre el proyecto real, revertida; sin avisos de Supabase.
- Procesador `scripts/worker.py`: probado de punta a punta en cola local
  (análisis → plan de usuario → render → QC en verde → archivo entregado). El
  camino del fallo también: un video fuera de límites falla con su motivo.

Sin probar por falta de datos o claves:

| Pendiente | Qué falta |
| --- | --- |
| Procesador contra Supabase real | `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API) |
| Web en modo nube con una sesión | Entrar con un correo real; el enlace llega por correo |
| «Proponer con IA» | `ANTHROPIC_API_KEY`; luego `scripts/propose_smoke.py <id>` |
| Otros videos | `docs/SECOND_VIDEO_TEST.md` |

Límites conocidos:

- El almacenamiento gratuito de Supabase admite 50 MB por archivo: los videos de
  más de 50 MB y los renders de más de unos 90 s no caben (el procesador lo avisa;
  haría falta subida reanudable o un plan de pago).
- La vista previa en la nube no tiene los efectos de Mixkit (no están en Git por
  licencia); los de Kenney sí.
- Las tarjetas se recolocan sobre la persona al renderizar, no al guardar: en la
  vista previa de la nube su posición es aproximada.
- Un video a la vez por procesador.

Pagos y créditos no están construidos.

## Decisiones del 10 de octubre de 2026

- **Sin música** en el producto: se agrega al publicar. Se quitó del plan, del
  esquema y de la composición; el audio sin música es idéntico al del v9.
- **Pruebas en la Mac**, y después migración a un VPS. El VPS básico de Hostinger
  (1 núcleo, 4 GB, sin GPU) sólo alcanza para la web y la cola; el recorte de la
  persona y el render necesitan un equipo más potente o con GPU.
- **Web primero, app después.** Ruta elegida: web instalable (PWA), que ya está, y
  más adelante envolverla con Capacitor para las tiendas. Un solo código; la vista
  previa en vivo con Remotion no se reescribe. Antes de publicar en tiendas hará
  falta: cuentas (modo nube probado con sesión real), notificaciones al terminar
  un render y subida reanudable para videos grandes.
- La interfaz interactiva ya cubre subir, ver el avance, editar con vista previa y
  línea de tiempo, guardar versiones, renderizar y descargar. Lo que sigue
  marcado «Próximamente» en ella es pedir cambios con lenguaje natural.

## Correcciones tras la revisión del 11 de octubre de 2026

- **Compilación de producción:** `next build` fallaba en el equipo que tiene el motor
  porque el compilador rastreaba `.venv/`. Las rutas del motor en `app/_lib/jobs.ts`
  llevan ahora el comentario `turbopackIgnore`, y el estilo y el esquema se importan
  como JSON. La web corre con `next build` y `next start` junto al motor.
- **Procesador:** su nombre se guarda la primera vez en `work/.worker-name` (o se fija
  con `PINK_WORKER_NAME`), así que al reiniciar reencola lo que dejó a medias. Ni el
  número de proceso ni el nombre del equipo servían: cambian entre arranques. Cada
  trabajo tiene un tope de 45 minutos. Un render que no cabe en el almacenamiento
  (45 MB) se sube en una copia más liviana; el original queda en `work/<id>/out/`.
  Un plan llegado de la base se comprueba (`check_plan` en `scripts/plan_io.py`)
  antes de renderizar.
- **Validación:** `validatePlan` acota duración, desfase, cantidad de elementos y el
  texto de las tarjetas; un contador exige la cifra dicha. El motor y la pantalla de
  subida rechazan videos horizontales.

### Acceso por invitación (modo nube)

La pantalla de entrada ya no crea cuentas (`shouldCreateUser: false`), pero eso sólo
vale para nuestra pantalla. **El cierre real lo hace Santiago en Supabase:**
Authentication → Sign In / Providers → apagar «Allow new users to sign up». Para dar
acceso a alguien: Authentication → Users → «Invite user» con su correo. Mientras el
registro siga abierto, cualquiera podría crear una cuenta llamando a la API, poner
videos en la cola y gastar propuestas de IA.

## Cuestionario de estilo (12 de octubre de 2026)

Antes de su primer video, el creador contesta seis preguntas en `/estilo`: de qué
habla, qué estilo de edición le gusta (limpio, equilibrado, dinámico), si quiere
gráficos, el color de su marca y si cambia con el tema, y el nivel de efectos de
sonido, más una nota libre. Cada opción se muestra con un clip real editado por el
motor (`public/estilo/`, generado con `python3 scripts/make_style_examples.py`).

- Se contesta **una vez por cuenta** y se cambia desde «Mi estilo» en `/app`. Local:
  `work/_profile.json`. Nube: tabla `public.profiles` (migración
  `20261012120000_pink_ai_profiles.sql`, ya aplicada; cada usuario sólo lee y cambia
  la suya).
- Al subir un video, el perfil se copia a su plan (`plan.preferences`). Los videos
  anteriores no cambian solos: el editor ofrece «Usar mi estilo actual».
- El color y el sonido se aplican en cada render. El tema, el estilo y el gusto por
  los gráficos guían «Proponer con IA», que además aplica reglas fijas
  (`app/_lib/proposalPlan.ts`). La tabla completa está en
  `docs/EDITING_GUIDELINES.md`.
- La propuesta con IA sigue sin probarse con la API real: falta `ANTHROPIC_API_KEY`.
  No se lanza sola al subir un video; sigue siendo un botón.
- Los ejemplos salen del video de piscina. Para usar otro material:
  `python3 scripts/make_style_examples.py --job <id>` y ajustar en ese script los
  tramos y los identificadores de los elementos.
