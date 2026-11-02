# CapCut y Canva: muestras estáticas para Cutkind

Investigación acotada del 27 de octubre de 2026. Alcance: referencias públicas e invitado, sin crear diseños, subir grabaciones, publicar, consumir créditos ni copiar activos a la aplicación. El trabajo aporta patrones reconstruibles; no instala efectos en el engine.

## Hallazgos y procedencia

| Referencia | Observado | Límite |
|---|---|---|
| [CapCut invitado](https://www.capcut.com/editor?scenario=custom) | Navegación separada Media, Templates, Elements, Audio, Text, Captions, Transcript, Effects, Transitions, Filters y Brand kit. | En esta visita apareció el modal de acceso. No se aceptaron términos, inició sesión ni probó un render. |
| CapCut, captura previa del mismo día | Texto separa plantillas y efectos; títulos y cuerpo son decisiones distintas. Captions separa reconocimiento, entrada manual e importación. | Evidencia histórica de esta investigación, no reobservación completa de todos sus paneles. |
| [Canva público](https://www.canva.com/) | Galería de herramientas por categoría, miniaturas e imágenes explicativas. Brand Kit muestra fuentes y muestras de color; plantillas se exploran como colección. | Página comercial pública, no editor autenticado. No permite afirmar el comportamiento interno de los presets. |
| Canva, dos bundles públicos analizados por REA | Inventario completo dentro de esos dos archivos, 526.292 bytes; 2 JavaScript parseados, 0 fallos. Strings incluyen aplicación de combinaciones de fuentes, controles de marca, sombras y referencias a efectos de texto. | Semántica global desconocida: 24 incógnitas; strings no prueban ejecución, disponibilidad ni parámetros del efecto. |

La ruta directa de efectos de texto de Canva devolvió 404. Se siguió el enlace visible «Take me home» y se investigó la página principal. No se hicieron búsquedas de variantes de URL ni se presentó el 404 como inexistencia de efectos.

## Evidencia REA

- Canva, padre: `ev_8040956c4822e32c6edaab0c35646e53a3f320438f3ac29ef9605e725828ad43`.
- Canva, vista resumen: `ev_6de8835526e12bdad726f0e84c3c39d8ee95af4d546ed580ea59eeb1375848a1`.
- Artefacto Canva SHA-256: `2f385ecfc2677f7ee1602e0237a5303c04bedcd03efad1a650c13dcb5d66f4e8`.
- CapCut, evidencia estática previa reutilizada: `ev_f4adec408418dd69a06f9fcfd25bbd5a92098b251834ee3f47346126015c0c2f`; [registro previo](../capcut-invideo-2026-10-27/REA-EVIDENCE.json).
- [Resultado Canva](REA-CANVA.json) y [manifiesto de procedencia/hash](CAPTURE-MANIFEST.json).

Los scripts se inventariaron mediante `pageAssets` de la página realmente abierta y se descargaron desde las URL públicas observadas para análisis inerte. REA no ejecutó los bundles. El bundle canónico completo permanece en `/tmp/cutkind-rea-capcut-canva-20261027/REA-BUNDLE.json`; originales temporales en la misma carpeta. Las observaciones de interfaz son de CUA, no se atribuyen a una captura CDP de REA. No había un endpoint CDP anunciado entre los puertos de escucha observados y no se modificó la configuración del navegador para crearlo.

## Aplicación propuesta en Cutkind

1. Separar tipografía, tratamiento del texto y composición. Una tarjeta de familia no debe alterar silenciosamente la fuente que el usuario ya escogió.
2. Comparar todas las opciones usando la misma frase y un lienzo original neutral; no enseñar a Fran ni una grabación del usuario para decidir.
3. Mostrar imágenes estáticas para frase limpia, palabra destacada, contorno, sombra, placa y jerarquía título/cuerpo. Colores exclusivamente de la paleta canónica de Cutkind; los acentos ajenos de CapCut o Canva no se trasladan.
4. Para comunicar una transición, presentar tres imágenes rotuladas «Inicio», «Durante» y «Final». No agregar controles de reproducción, autoplay, MP4, GIF ni animaciones CSS a estas muestras.
5. Mostrar B-roll y composición con una fotografía original o con licencia comprobada: imagen enmarcada, tarjeta editorial o vista en paralelo. Una miniatura de Canva no autoriza reutilizar el activo ni su plantilla.
6. Confirmar explícitamente las preferencias antes de procesar. El resumen debe conservar IDs de fuente, familia y efectos; las tarjetas solo ofrecerán opciones realmente implementadas en el renderer.

Los tratamientos propuestos son reconstrucciones originales de patrones generales. No se recuperaron algoritmos, parámetros de animación, fuentes propietarias, plantillas premium, imágenes de stock ni APIs privadas. No corresponde presentar este catálogo como nuevos efectos funcionales ya integrados.

## Próxima extracción útil

Un siguiente pase puede observar un documento vacío del editor de Canva ya autorizado por el usuario, sin material privado, para medir controles de espaciado, borde y sombra con un texto de ejemplo. En esta ronda no se creó tal documento remoto. Conviene priorizar controles y recetas verificables antes de ampliar el catálogo con nombres que el engine todavía no exporta.

## Integración propia en esta ronda

Tras la investigación se verificaron dos reconstrucciones propias de interfaz: imágenes con paleta exclusivamente Cutkind y trípticos estáticos para cambios de toma. El catálogo marca solo esos patrones como implemented-static-preview. No se importaron plantillas, imágenes, fuentes propietarias ni código de efectos de CapCut/Canva al motor. Los controles nuevos de contorno/sombra y otros selectores siguen siendo propuestas.
