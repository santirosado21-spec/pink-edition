# Corrección de dirección visual del loop de Fran

Estado: implementación y pruebas locales; aprobación estética del usuario pendiente.

El usuario rechazó el aspecto de las pruebas. Se pidió una crítica independiente a Claude Code mediante claudex-route. La llamada de lectura, sin herramientas de escritura ni MCP externos, terminó correctamente; alias solicitado `sonnet`, modelo observado `claude-sonnet-4-6`. Vio muestras de la referencia editada y capturas reales de los exports. El informe privado está en `work/fran-loop/native-design-review/CLAUDE-CRITICA.md`. La dirección, clasificación y selección de recursos del motor continúan con Sol, sin fallback de proveedor.

## Causa y cambio

La geometría anterior reducía el A-roll vertical al 46% de la altura durante cada beat y reservaba un gran panel oscuro. El nuevo layout vertical versionado mantiene el A-roll al 100% de alto y ancho, con `contain` para preservar el encuadre original sin recortar rostros; en originales 9:16 llena la pantalla. Las composiciones horizontales y los planes históricos sin versión nueva conservan su interpretación.

`NativeEditorial` ofrece frases grandes sincronizadas con captions, comparación de cifras en dos columnas, anotaciones breves e inserts redondeados sin panel exterior. La pareja tipográfica sigue siendo la elegida en el brief. No se crearon ni atribuyen fuentes a Claude: se emplean los archivos existentes de Inter Display, DM Serif Display/DM Sans y Space Grotesk/DM Sans para comparar tres tratamientos propios. Reutiliza las familias existentes Enlace y Estampa; las demás siguen disponibles en el catálogo.

Las tarjetas ahora duran hasta el final hablado de su frase, respetando el siguiente evento y el final del montaje. Un énfasis reemplaza la capa de subtítulo normal durante ese evento para evitar texto duplicado. Las pausas largas quedan sin texto. Los rechazos de páginas breves continúan respetándose mediante las adaptaciones del plan.

## Rostro y recursos

Antes de construir las superposiciones se mide el proxy real con Apple Vision a 2 muestras/segundo más el último frame del intervalo. Se reserva 6,5% de margen bajo los rostros medidos y una banda superior a los subtítulos. Una detección ausente o un espacio insuficiente bloquea ese overlay: permanece A-roll completo, sin reducir al presentador. El informe conserva los eventos omitidos y la evidencia. Se recalculan los requisitos de recursos realmente mostrados. El muestreo no garantiza los frames intermedios; sigue siendo necesaria la inspección visual.

En la prueba de Tiempo ahorrado se omite el inserto del elevador debido a detecciones incompletas durante el movimiento. Se conservan dos tarjetas, comparación, anotaciones y otros tres recursos visuales. La versión Estampa puede usar una lámina del segundo 1 de un recurso ya elegido y revisado visualmente por Sol, conservando su procedencia. No se supone que una lámina aporte evidencia de cifras o acontecimientos.

Se inspeccionaron las siete imágenes aportadas en Fotos. Una incluye marca de Shutterstock; no se incorporó. Estas pruebas utilizan los recursos de Wikimedia con procedencia previamente registrada. No se afirma haber implementado los algoritmos o las plantillas de CapCut/InVideo; su investigación y el Style Lab existente son referencias para construir composiciones propias.

## Prueba local

`http://localhost:3001/work/fran-loop/native-design-review/index.html`: tres muestras del mismo intervalo, montaje completo documental, comparación con el resultado anterior y referencia editada separada del material crudo. Ningún video editado se toma como benchmark de crudo.

El nuevo renderer admite medios de sesiones locales y carpetas locales archivadas. Así las pruebas no dependen de la caducidad del upload. Los originales, la crítica y los planes privados permanecen en carpetas de trabajo ignoradas; no se despliega ni publica nada fuera del equipo.
