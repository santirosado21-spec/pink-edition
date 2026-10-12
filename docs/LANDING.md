# Landing de Pink.ai

La landing vive en `app/page.tsx`, `app/landing.css` y `app/_landing/`. Todos los
selectores están bajo `.landing` para no afectar a `/app` ni al editor. La página es
un componente de servidor, sin estado ni JavaScript propio.

Dos reglas del dueño: **no hay animaciones** (ni `@keyframes` ni transiciones) y el
producto se muestra con **video real**, no con ilustraciones ni fotos de stock.

## Estructura

En orden: aviso de acceso por invitación, navegación, propuesta con el video editado
completo, antes y después, cómo funciona (cuatro pasos), qué incluye (tres clips y
tres datos), correcciones conversacionales (conversación estática, marcada
«Demostración»), planes, dictado por voz, preguntas frecuentes y cierre.

Componentes: `Video` (reproductor nativo con controles), `Chat`, `Plans`, `Faq` y
`Elements` (marca, botón principal, encabezados).

## Videos

Están en `public/landing/` (unos 6.5 MB) y sus rutas en `app/_landing/config.ts`
(`hero`, `demo`, `clips`). Salen del video de piscina:

- `edited-full.mp4`: la edición completa (53 s, 540 × 960). Es el único que arranca
  solo, mudo y en bucle.
- `original-20s.mp4` y `edited-10s.mp4`: la grabación sin editar y la misma historia
  editada.
- `clip-color.mp4`, `clip-card.mp4`, `clip-background.mp4`: corte de color, tarjeta
  detrás de la persona y fondo.

Se generaron con `ffmpeg` desde el render v9 sin música y el original, y no llevan
metadatos. El dueño pidió usar este video el 10 de octubre de 2026; se asume que
tiene permiso de quien aparece. Para cambiar la demo, reemplazar los archivos.

## Configuración editable

En `app/_landing/config.ts`:

- `flowConnected: false`: el botón dice «Solicitar acceso» y lleva a `#acceso`. Con
  `true` dice «Editar mi primer video» y lleva a `/app`. Sólo cambia el enlace.
- `accessEmail: ""`: al llenarlo aparece un enlace `mailto:` en el cierre.
- `plans`: Por video, Creador y Pro. Los campos `null` se muestran «Por definir».
- `faqConditions`: la duración máxima sale de `style/pink-demo-v1.json`; el peso
  máximo es el del motor (500 MB) o, con el modo nube activo, el del almacenamiento
  (50 MB). El resto está sin definir.

## Qué es real y qué no

Real: subida, corte de silencios, subtítulos, cortes de color, tarjetas, fondos,
sonido, vista previa, render y descarga, hoy en el equipo del dueño.

Marcado «Próximamente»: la primera edición propuesta por IA (el código existe, sin
probar), los cambios pedidos con palabras, los precios y el dictado por voz. No hay
pagos, créditos ni formulario de solicitud. No se inventan testimonios, clientes,
cifras ni precios.

No cambiar `flowConnected` a `true` hasta validar el flujo público completo
(`PINK_AI.md`).
