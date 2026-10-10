# Landing de Pink.ai

La landing vive en `app/page.tsx`, `app/landing.css` y `app/_landing/`.
No modifica el editor ni el pipeline. Todos los selectores están bajo `.landing`.
Usa el logo real `/logo.png`, la fuente local Inter Display y una ilustración SVG
propia recuperada de la landing anterior. No añade dependencias, fotografías,
material privado, fuentes CDN ni recursos externos. No se hicieron commits.

## Estructura

Nueve secciones, en orden: propuesta y presentación vertical; comparación;
flujo previsto; herramientas de edición; conversación; planes; dictado;
preguntas frecuentes; cierre y acceso. `Elements` contiene marca, CTA, etiquetas
y encabezados reutilizables; `ProductPreview` es la única interacción con estado
(estilos de una ilustración); `Illustration` contiene SVG; `DemoComparison`,
`Plans` y `Faq` presentan datos. La página permanece como componente de servidor.

## Configuración editable

En `app/_landing/config.ts`:

- `flowConnected: false`: CTA «Solicitar acceso» hacia `accessHref` (`#acceso`).
  Al poner `true`, cambia a «Editar mi primer video» hacia `/app`. Este interruptor
  cambia el enlace; no habilita servicios ni constituye autenticación.
- `accessEmail: ""`: no se muestra correo. Al configurarlo aparece un enlace
  `mailto:`. Sin correo, el bloque explica que el acceso es por invitación y que
  el canal se anunciará aquí. No recoge solicitudes ni simula un envío.
- `demo.original` y `demo.edited`: `null`. Solo al definir ambos se muestran
  reproductores con controles, sin autoplay y sin precarga. Usar rutas locales
  de material autorizado expresamente para publicación. `demo.captions` permite
  un archivo VTT en español; comprobar su sincronización en ambos videos o
  ampliar la configuración para pistas independientes si sus tiempos difieren.
- `plans`: Por video, Creador y Pro; `price`, `credits`, `admittedDuration` e
  `includedCorrections` aceptan texto o `null`. Los valores nulos se muestran
  como «Por definir». Incluir moneda y periodicidad en el precio cuando se acuerden.
- `faqConditions`: extensiones, peso máximo, duración admitida, condiciones de
  correcciones, consumo de créditos y disponibilidad de descargas. Actualmente
  todos son `null`. Mantener estas condiciones coherentes con los planes.

## Qué funciona y qué es demostración

El sistema `/app` funciona únicamente en la máquina del propietario, sin cuentas
ni pagos: subida, corte automático de silencios, subtítulos por palabra, selección
manual por frase de cortes de color, tarjetas y fondos, efectos de sonido,
vista previa, render y descarga MP4 de 1080 × 1920. Solo se ha probado material
vertical de una persona hablando a cámara en español.

La ilustración interactiva dice «Demostración ilustrada» y solo cambia estilos;
no procesa archivos ni reproduce audio. La comparación presenta «Demo pendiente»
hasta disponer de ambos videos autorizados. La conversación es estática y dice
«Demostración»; no envía mensajes ni afirma que se haya realizado un cambio.
Primera propuesta de IA, conversación, planes y voz llevan «Próximamente».
El código de propuesta automática existe, pero está sin probar. No se ofrecen
compras, créditos activos ni capturas de micrófono. «Entrar» apunta a `/app`
para el uso local existente; no implica que exista un login público.

## Qué falta conectar

1. **Carga pública:** cuentas y autorización real, almacenamiento privado por
   usuario, URLs firmadas, validación de archivos, límites acordados, estados y
   errores, política de conservación y borrado. Conectar persistencia y cola al
   procesador; el enlace de acceso no protege el editor ni sus API.
2. **Pagos y créditos:** definir precios, moneda, duración, correcciones y reglas
   de consumo; integrar proveedor, confirmaciones verificadas e idempotentes,
   registro de saldo y movimientos, fallos y devoluciones. Mostrar el costo antes
   de confirmar una edición. No hay checkout implementado en esta landing.
3. **Primera edición automática:** probar el código existente con la API y
   material autorizado variado; validar planes, fidelidad de palabras y orden,
   ubicación de gráficos y resultados. Ampliar catálogo, conectar trabajos,
   reintentos, vista previa, revisión, render y descarga por usuario. Separar QC
   técnico del MP4 de la aprobación visual y auditiva.
4. **Correcciones conversacionales:** interpretar instrucciones como cambios
   validados al plan, preservar versiones, mostrar propuesta y resultado, manejar
   ambigüedades y errores, definir consumo/costos de las correcciones.
5. **Dictado:** implementar permiso de micrófono, captura, transcripción y revisión
   del texto antes de aplicar instrucciones. Hoy no solicita permisos.
6. **Acceso y demo:** configurar un canal de invitación real y obtener autorización
   para publicar el antes/después y sus subtítulos antes de añadir las rutas.

No cambiar `flowConnected` a `true` hasta validar el flujo público completo.
Las etiquetas y los textos de disponibilidad son explícitos y deben revisarse
cuando las capacidades se conecten; no desaparecen al cambiar solo el CTA.

## Accesibilidad y revisión

Encabezados semánticos, enlace de salto, foco visible, controles con
`aria-pressed`, FAQ nativa con `details`, enlaces descriptivos y reproductores
nativos. Paleta de texto oscuro sobre fondos claros; texto claro en la ilustración
oscura. Diseño móvil primero con columnas de ancho flexible. No hay animaciones
automáticas; se incluye `prefers-reduced-motion` para desactivar movimiento.
La verificación visual en navegador debe comprobar 375 px y escritorio, ausencia
de desbordamiento, foco por teclado, FAQ, estilos de la ilustración, anclas y CTA.
Los videos configurados requieren además revisión audiovisual y de sus pistas.

## Resultado de esta entrega

- `npx tsc --noEmit`: pasa.
- Comprobación TypeScript estricta de `app/page.tsx` y `app/_landing/*`, con
  resolución bundler y JSX de React: pasa.
- `npx tsc --noEmit -p tsconfig.next.json`: falla por declaraciones duplicadas
  preexistentes en `.next/dev/types/routes.d 2.ts` (`PageProps`, `LayoutProps`,
  `RouteContext`). No se modificó ese archivo generado, fuera del alcance.
- `git diff --check`: pasa. Los cambios de esta entrega están en el alcance
  autorizado. `CLAUDE 2.md` y `README 2.md` ya estaban sin seguimiento y se
  conservaron intactos.
- No se pudo iniciar localhost: el sandbox rechazó `127.0.0.1:3000` con `EPERM`.
  No se afirma verificación visual, medición de desbordamiento a 375 px ni
  aprobación estética; esas comprobaciones quedan para el navegador del dueño.

## Actualización del 9 de octubre de 2026

- Las preguntas frecuentes muestran los límites reales del motor (120 s de material y
  500 MB), tomados de `style/pink-demo-v1.json`. En la nube el archivo máximo es de
  50 MB por el plan gratuito de Supabase Storage.
- Ya existen el código de cuentas, la cola y el procesador, pero sin probar con una
  sesión real ni con la clave de servicio: ver `PINK_AI.md`. Hasta entonces el botón
  sigue siendo «Solicitar acceso» (`flowConnected: false`).

## Rediseño del 10 de octubre de 2026

La landing se rehízo con otra dirección (menos texto de advertencias, más producto):

- Tipografía ancha (Inter Display Bold), la misma de los videos, para los titulares.
- Hero con una demostración animada e interactiva del teléfono (`HeroPhone`): captions,
  tarjeta detrás de la silueta, corte de color y fondo. Se puede elegir la escena.
- Comparador de antes y después arrastrable (`Compare`). Con `demo.original` y
  `demo.edited` en `app/_landing/config.ts` usa los dos videos reales; sin ellos, una
  ilustración. No hay fotos.
- Una sola barra de aviso arriba («abre por invitación») en lugar de avisos en cada
  sección; «Próximamente» sólo en lo que no existe: primera edición con IA, cambios en
  lenguaje natural, planes con precio y dictado por voz.
- Conversación de ejemplo animada, etiquetada «Demostración».
- Todo respeta `prefers-reduced-motion`. Los estilos están bajo `.landing`.
