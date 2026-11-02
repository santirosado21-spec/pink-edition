# Revisión visual con Claude

Petición: mejorar personajes del cuestionario, retirar una imagen que estorba y facilitar el inicio desde cero.

Claude Code, versión 2.1.311, llamada independiente con modelo solicitado y observado `claude-opus-5-5`. Herramienta Read únicamente; MCP vacío, configuración restringida, sin herramientas de edición, sin fallback. Consultó la captura y el código de muestras proporcionados. Salida completa local: `work/questionnaire-claude-review/claude-review.md`. No cambió el motor Sol.

Hallazgos adoptados: eliminar pelo/ojos/sonrisa y arquitectura repetida; retirar personas de gráficos y apoyos; usar silueta neutra únicamente para posiciones; ampliar gráficos; quitar cilindros/esferas; ocultar muestra general en un details cerrado y eliminar columna sticky. Se mantuvieron los tokens Cutkind originales, incluidos neutros del tema oscuro.

La referencia a imagen superior izquierda no era inequívoca: se eliminaron tanto los adornos de las tarjetas como la aparición automática de la muestra general (que antes precedía al cuestionario en pantallas estrechas).

Enlace: `http://localhost:3001/app?new=1`, verificado con campos vacíos y paso 1 de 4. Evita restaurar la sesión previa sin eliminarla. También se añadió un enlace al principio de /muestras.

Verificación: TypeScript; 420 combinaciones SVG con paleta Cutkind y sin video/audio/animación; roundtrip de selección; navegador con panel cerrado, teclado Enter para abrir/cerrar, ampliación/cierre de imágenes, selección legible (tinta rgb(32,33,31) sobre coral rgb(243,107,82)), cero medios, sin desbordamiento horizontal. Revisión visual detectó y corrigió una regla CSS descendiente que partía el caption: ahora aplica solo a la etiqueta directa del botón. Aprobación estética pendiente del usuario.
