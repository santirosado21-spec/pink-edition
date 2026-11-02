# Estado actualizado: solo imágenes y paleta Cutkind

La instrucción posterior del usuario sustituye las muestras en Player por imágenes SVG estáticas en /muestras y en el cuestionario. Se quitaron reproducción, detalle por fotograma, pantalla completa de video y muestras de audio previas a la carga. El diálogo de ampliación muestra únicamente imágenes. Las transiciones se ilustran con Inicio/Cambio/Resultado; no se reproducen ni animan.

Bordes, fondos, resaltados y muestras usan coral, crema, tinta y neutros canónicos. El color para la exportación se introduce como texto hexadecimal y no tiñe la UI. Se preservan las preferencias de exportación y el motor Sol. Las láminas son ilustraciones del tratamiento, no renders exactos de un futuro raw.

Se verificaron 300 SVG: paleta permitida, ausencia de audio/video/animación y aislamiento de un color de exportación externo a la paleta. TypeScript pasó. En navegador se observaron cero elementos multimedia, animation-name none, tres imágenes en la secuencia, ampliación/cierre y cambio de fuente correcto. Las pruebas previas de render y sesión permanecen históricas, no se repitieron como aprobación de esta versión.

Investigación REA nueva: [CapCut y Canva](capcut-canva-2026-10-27/INVESTIGACION.md). La evidencia de Canva cubre dos bundles públicos; el detalle del editor de CapCut quedó bloqueado por acceso. Las nuevas propuestas se separan de los patrones de UI ya implementados.

---

## Registro anterior, sustituido en lo relativo a muestras en video

# Cuestionario y muestras visuales

Listo para pruebas locales. Se verificó el recorrido desde /muestras hasta confirmar un encargo y habilitar la carga, con recuperación tras recargar. La elección personalizada de familia, fuente, captions y sonidos coincide con el brief guardado por el servidor. En esta revisión no se repitió una carga/render de raw; las pruebas reales de video están documentadas en el loop de Fran.

## Cambios

- Galería /muestras accesible antes de rellenar objetivo o subir archivos. Misma sección reutilizada dentro del cuestionario.
- Diez opciones existentes de fuente/pareja, ahora visibles y filtrables. No se instalaron diez fuentes nuevas.
- Cinco familias con descripciones ajustadas a lo implementado.
- Seis muestras: subtítulos, énfasis, comparación, lista, imagen de apoyo y cambio de toma. No son seis efectos nuevos: muestran funciones disponibles del motor.
- Un único Player activo usa OneShotVideo, el mismo componente de preview/export. Las ilustraciones originales son sintéticas, con procedencia y generador reproducible en scripts/setup-style-demos.mjs. No se utiliza Fran.
- Reproducción animada, detalle fijo y pantalla completa del Player.
- La combinación pasa al cuestionario mediante una URL validada que excluye tema, notas y contenido privado. Al confirmar se reemplaza por el enlace de sesión para recuperar el encargo al recargar. Las sesiones anteriores no se alteran.
- Resumen con familia, tipografía, subtítulos y sonidos. Muestra de carácter sonoro y selector de pack.
- Pistas/B-roll propios señalados como pendientes; las pruebas actuales usan música incluida y clips de banco. Se retiró el selector de material que prometía cambios que el layout vertical no aplicaba.

## Comprobaciones

TypeScript y validación de briefs pasaron. Se probaron 300 combinaciones de planes (cinco familias × diez fuentes × seis ejemplos), preservación de preferencias, límites temporales y existencia/duración de recursos. No equivalen a 300 renders aprobados. Se probó el traslado de selección y el rechazo de parámetros inválidos o ajenos al estilo.

Playwright comprobó cambios reales de fuente/captions, comparación, lista, JPG de papel, barrido de color, enfoque suave y zoom. La carga quedó habilitada y el brief elegido se conservó después de recargar. Revisión React: un Player por vista, carga de fuentes deduplicada, estado local y controles con nombres accesibles. El viewport móvil no se probó interactivamente.

## Límites

Es una prueba local, no aprobación estética de producto terminado. Cada original admite hasta 120 segundos y la sesión es temporal. Las muestras sintéticas no garantizan encuadre, pertinencia o calidad en un raw aún no analizado. Los estilos todavía necesitan más identidad de composición y feedback humano. Sol y la facturación no se cambiaron.
