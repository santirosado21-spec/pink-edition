# Cutkind — identidad e interfaz

## Dirección

Coral `#F36B52`, tinta `#20211F`, blanco cálido `#F7F5EF`. DM Sans variable alojada localmente, con su licencia OFL. Símbolo vectorial original de Figma: https://www.figma.com/design/svweQnUpqpENMplh4jpCoE?node-id=2-2.

La aplicación utiliza superficies claras u oscuras, con coral para las acciones. El texto de acento usa tonos derivados con mayor contraste: `#B83E29` en claro y `#FF947E` en oscuro. Las muestras de estilo y el vídeo conservan sus colores propios.

## Investigación de referencias

Se buscaron bibliotecas de proyectos, carga de material, edición por texto, timeline, edición móvil, kit de marca y presentación del producto. Mobbin responde «Mobbin MCP requires a paid plan»; por tanto no se pudo completar la búsqueda exhaustiva dentro de su catálogo ni se atribuyen pantallas obtenidas a Mobbin. Se utilizaron las siguientes fuentes públicas. Las capturas de otros productos no se incorporan como assets del producto.

| Pantalla / flujo | Fuente | Decisión para Cutkind |
| --- | --- | --- |
| Biblioteca de proyectos | [Descript, Drive View](https://www.descript.com/blog/article/descript-tutorial-for-beginners-6-steps-to-get-started) | Tarjetas con vista previa, nombre y estado. Pantalla examinada visualmente. |
| Editor de transcripción | [Descript, editor](https://www.descript.com/blog/article/descript-tutorial-for-beginners-6-steps-to-get-started) | Separar texto, vista previa y propiedades. Pantalla examinada visualmente. |
| Vista de escenas y herramientas | [Descript, Scene editor](https://help.descript.com/hc/en-us/articles/10165362727821) | Mantener controles cerca de la vista previa; documentación de apoyo. |
| Timeline de precisión | [Descript, tour](https://www.descript.com/tour) | Timeline independiente de la lectura del texto; documentación de apoyo. |
| Editor móvil | [CapCut App](https://www.capcut.com/resource/capcut-app) | Vista previa superior y controles por grupos debajo. Hero con pantalla móvil examinado visualmente. |
| Inicio de creación | [VEED, dashboard](https://support.veed.io/en/articles/11641509-how-veed-s-dashboard-works) | Una acción principal visible y biblioteca separada; documentación de apoyo. |
| Biblioteca y proyectos recientes | [VEED, Project Library](https://support.veed.io/en/articles/11641509-how-veed-s-dashboard-works) | Metadatos legibles, estados y continuidad al volver a un proyecto. |
| Marca en el editor | [VEED, Brand Kits](https://support.veed.io/en/articles/9616498-how-to-create-and-manage-brand-kits) | Agrupar tipografía, color y recursos en la configuración de estilo. |
| Organización de identidad | [Canva, Brand Kits](https://www.canva.com/help/brand-kit/) | Reutilizar una sola identidad en todas las rutas. |
| Aplicación de marca al contenido | [Canva, Brand Templates](https://www.canva.com/help/using-brand-templates/) | Separar los colores de la interfaz de los colores elegidos para cada vídeo. |

## Cambios

- Componentes compartidos `Brand` y `ThemePicker` en landing, estudio, editor, estilo, login y espera.
- Preferencia claro/oscuro/sistema guardada en `cutkind-theme`; inicialización antes de pintar para evitar parpadeos; cambios de sistema y otras pestañas sincronizados.
- Landing con nueva composición, logo y tipografía; biblioteca con carga por teclado y estados; subida desactivada donde no hay motor remoto.
- Editor con columnas flexibles en escritorio y pestañas en móvil; controles de reproducción accesibles también en móvil.
- Iconos del navegador, Apple y manifest actualizados.
- Icono para pantalla de inicio con fondo blanco puro `#FFFFFF`, símbolo coral y PNG opacos. Fuente vectorial: `public/brand/cutkind-app-icon.svg`; versión de caché del manifest: `white-1`. El sistema del teléfono aplica el recorte exterior.
- Sin cambios de procesamiento de vídeo en esta tarea. Se preservan las modificaciones locales anteriores del motor y del catálogo.

## Entrega y comprobaciones

TypeScript y compilación Next.js de producción comprobados. Revisión visual a 320, 390, 768 y 1280 px, incluyendo ambos temas, navegación entre rutas y pestañas móviles. El despliegue se prepara en una carpeta temporal con una lista explícita de código y assets públicos: no incluye `public/client`, `public/work`, trabajos, timelines privadas ni archivos de entorno.

El proyecto de Vercel conserva su nombre técnico `pink-edition` y su dominio actual; la marca visible es Cutkind. El engine remoto continúa pendiente de la siguiente etapa.

### Versión publicada

- Dominio: https://pink-edition.vercel.app
- Despliegue final: `dpl_aYFhMbbEscCz3undemibWcLAXLJL`, estado `READY`, producción.
- Origen: instantánea del árbol local sobre `271e604`; no se creó un commit ni se modificaron cambios ajenos.
- Compilación de Vercel: 21 segundos; promoción al dominio completada.
- Verificado en el dominio público: landing, estudio, estilo, cambio claro/oscuro, persistencia tras recargar, ausencia de desbordamiento horizontal a 390 px y consola sin errores en la sesión nueva.
- SVG, fuente y PNG del icono públicos: HTTP 200 y hashes iguales a los archivos locales. Manifest con nombre Cutkind e iconos actualizados.
- El editor con material real se verificó en local. Vercel no dispone de esos proyectos privados ni de procesamiento remoto.

### Retirada de la demo de Fran

Por petición del usuario se retiran los 48 vídeos y miniaturas de `public/landing` y `public/estilo`, junto con todas sus referencias en la portada y el cuestionario. La portada muestra la identidad de Cutkind y anuncia una nueva demo con grabación propia. Las opciones del cuestionario conservan su comportamiento; el color se muestra con una paleta y se mantienen los ejemplos sintéticos del catálogo y los efectos de sonido licenciados.

El material retirado queda archivado localmente fuera del repositorio y de las carpetas públicas, en `../private-archive/fran-web-demo-2026-10-15/`. No forma parte del despliegue. No se han modificado proyectos del usuario ni el motor.

Comprobado: TypeScript, compilación de producción, portada sin reproductores ni imágenes rotas, vista de escritorio y móvil, selección de estilo y paleta de color. Los 48 enlaces antiguos del dominio público devuelven HTTP 404.
