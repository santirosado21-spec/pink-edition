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
- **Música:** la plataforma no puede incrustar canciones con derechos. Usar
  pistas con licencia o dejar que se agregue al publicar.
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
