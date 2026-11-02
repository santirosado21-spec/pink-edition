# Recursos visuales: CapCut y Canva

Fecha: 27 de octubre de 2026. Segunda investigación focalizada: gráficos, video/foto de apoyo, fondo de persona y palabras que llenan el encuadre. Esta entrega documenta patrones e implementación propuesta; no modifica el motor ni afirma que una opción nueva esté ya exportando videos.

## Qué se comprobó

| Pregunta | Evidencia | Conclusión y alcance |
|---|---|---|
| ¿Cómo presentar gráficos antes de editar? | Canva, catálogo visible de `infographic comparison`; captura `canva-comparison-catalog.png` | Dos columnas equivalentes, título común y jerarquía repetida para comparar. Los ejemplos incluyen esquemas, imágenes y etiquetas. En Cutkind conviene mostrar miniaturas separadas para cifra, comparación y pasos, con cifras expresamente ilustrativas. |
| ¿Cómo enseñar foto/video de apoyo? | Catálogo Canva `kinetic typography`; captura `canva-typography-catalog.png`. Etiquetas estáticas de CapCut para stock y de Canva para fotos/marcos. | Se observó fotografía de producto enmarcada sobre texto repetido y video/imagen como fondo de titulares. Una foto fija puede representar el encuadre de B-roll sin reproducirlo. La etiqueta debe distinguir foto de clip, aunque ambos usen miniaturas. |
| ¿Qué significa fondo detrás de la persona? | Etiquetas de CapCut para quitar fondo, desenfoque y color; Canva para quitar fondo de video. | Son operaciones diferentes: fondo de lienzo alrededor de la toma, tratamiento sobre la imagen completa y recorte real de sujeto. Las etiquetas no demuestran que tengamos una máscara temporal local ni que el pelo/manos se recorten bien. No prometer reemplazo detrás del sujeto sin esa implementación y QC. |
| ¿Cómo mostrar palabras a pantalla completa? | Miniaturas Canva con titulares dominantes, líneas apiladas y tamaños contrastados. | Puede reconstruirse un intertítulo original Cutkind: fondo sólido, frase literal corta y fuente elegida. La voz debe seguir; la toma queda cubierta solo durante ese acento. No requiere segmentación. Texto detrás del sujeto sí requiere máscaras. |

## Evidencia REA efectiva

Se importó y verificó el bundle canónico anterior de Canva; los IDs retenidos de otra sesión no estaban disponibles inicialmente. Se reutilizó la evidencia en lugar de repetir el análisis entero.

- Canva, análisis padre: `ev_8040956c4822e32c6edaab0c35646e53a3f320438f3ac29ef9605e725828ad43`.
- Vista de módulos nueva: `ev_d2ce5cefbfaeda52e68236504574a488460c7225dfb62ea4d0373f175ff9a3ca`.
- Módulo de localización focalizado: `ev_e1786cc1d1f594560abc16b00f5e48c1e8b3ccab87e06c610905c5f82d8c224e`.
- Traza entrante literal `background`: `ev_e103108901748a987bdc04e37d3eb76df1ffe82ea707f8d33e012c79dde2a9af`, cero nodos coincidentes. El módulo contiene etiquetas de fondo, pero el grafo no representa esas cadenas como una ruta ejecutable. Es una búsqueda negativa acotada, no ausencia de función.

La evidencia completa anterior de CapCut no estaba retenida en esta conexión. Se analizó un subconjunto distinto y explícito: solamente su archivo público de localización, conservando los bytes y SHA-256 del manifiesto anterior. No se repitió el análisis masivo parcial de nueve scripts.

- CapCut focalizado, análisis padre: `ev_668aa31724a1adadaff0c0cd1f8c137787da7742f494c65c30d4e7581df69620`.
- Resumen: `ev_a02ea0e57ecf5733a371d4356a99577cacafbe0d28cf6c952a260e46c9092228`.
- Archivo: `en.2e0c2c38edb09f9c9b0b32c33aa5e4d7.js`, SHA-256 `9c14a9b2d8db453da03e4f5540ac7935e778a7952367f22dc4e9c423219e6208`, 1.399.915 bytes; 1 JS parseado, 0 fallos. Inventario completo dentro de ese archivo; semántica desconocida con una incógnita. No equivale a recuperar el editor.

`REA-BUNDLE.json` conserva los siete registros canónicos completos de esta sesión (170.670 bytes). `STATIC-LABEL-EVIDENCE.json` registra extracción local inerte de etiquetas y hashes, separada de los resultados REA. No ejecutó JavaScript del competidor. El extracto no incorpora implementaciones ni recursos de sus catálogos al producto.

## Observación de interfaz y límites

La interfaz se observó mediante CUA, no mediante CDP de REA. En Canva la sesión disponible abrió el catálogo de plantillas. Se realizaron búsquedas y lectura de miniaturas; no se abrió un diseño del usuario, no se editó ni guardó un proyecto, no se compraron recursos. El aviso de cookies reapareció tras intentar rechazar las opcionales; no se atribuye a esa acción una persistencia comprobada.

CapCut volvió a mostrar el editor invitado con Media, Templates, Elements, Text, Captions, Effects, Transitions, Filters y Brand kit, además de un modal de acceso. Se conserva `capcut-access.png`; no se aceptaron términos ni se subió material. Su comportamiento de recorte y plantillas sigue sin probarse en runtime.

Fuentes de interfaz: [Canva, tipografía](https://www.canva.com/s/templates?query=kinetic+typography), [Canva, comparaciones](https://www.canva.com/s/templates?query=infographic+comparison), [CapCut, editor](https://www.capcut.com/editor?scenario=custom). Los títulos de plantillas son evidencia de catálogo, no permisos para reutilizar sus medios. Solo se guardan capturas como evidencia local de investigación; ninguna imagen/plantilla propietaria se incorpora al cuestionario.

## Contrato de producto recomendado

1. **Gráficos**: ninguno / cifras y comparaciones / pasos / mezcla selectiva. Mostrar tres miniaturas, cada una con propósito; solo generar datos presentes en la voz.
2. **Apoyos**: ninguno / videos / fotografías / ambos. Origen y presentación son elecciones separadas. Una opción solo debe estar disponible si el proveedor y renderer la resuelven; de lo contrario, mostrar su ejemplo como propuesta.
3. **Presentación de apoyos**: recuadro seguro, pantalla dividida o cobertura completa con voz continua. El recuadro no debe ocupar la cara ni duplicar captions.
4. **Fondo**: conservar original; lienzo de marca alrededor de la toma; sustitución del fondo real únicamente cuando exista segmentación temporal verificada. Un filtro sobre el frame entero no debe llamarse desenfoque del fondo de persona.
5. **Palabras protagonistas**: ninguna / frase grande sobre toma / intertítulo a pantalla completa. El intertítulo usa exactamente la fuente y texto literal seleccionados y tiene un límite de frecuencia.

Todos los ejemplos del cuestionario deben ser imágenes estáticas originales en coral, crema y neutros Cutkind. El catálogo adjunto describe candidatos y aceptación; su estado es `research-specified`, no integrado. La integración del padre debe actualizar su estado solo después de probar persistencia de preferencias y render correspondiente.

## Incógnitas y siguiente comprobación

No se recuperaron algoritmos de segmentación, modelos, pesos, curves de movimiento, tiempos exactos, plantillas editables ni licencias de activos competidores. No se comprobó disponibilidad de cada etiqueta por cuenta o plan. Para probar una reconstrucción, usar dos raws locales: gráficos con datos realmente dichos; B-roll literal sin eventos prohibidos; un intertítulo con voz intacta; máscaras de pelo/manos y estabilidad entre frames si se habilita fondo real. Una imagen de muestra no demuestra el resultado temporal ni sustituye esa prueba.

## Integración posterior del agente principal

El cuestionario ahora presenta ilustraciones originales y controles para comparaciones/listas, clips/láminas fijas/ninguno, y palabras sobre la toma/a pantalla completa/solo subtítulos. Las preferencias pasan por URL, validación, resumen y brief. El worker filtra propuestas desactivadas antes de buscar stock. Una elección explícita de video impide que Estampa convierta ese clip a imagen. Las láminas se derivan de un clip revisado, con procedencia; no se anuncian como fotografías independientes.

El intertítulo está implementado en `src/FullScreenWords.tsx`, compartido entre imagen ilustrativa y renderer. En la composición se coloca encima del video montado, preservando su ruta de voz, y oculta la capa duplicada de captions. La medición del rostro reconoce la cobertura intencional solo cuando el usuario eligió fullscreen. Se limita a los eventos card del director (máximo dos). La revisión Sol recibe el contrato correcto.

Fondos detrás de la persona y fotografías de archivo independientes tienen ejemplos, sin botón de selección. El fondo original se conserva. La presentación dividida/cobertura de apoyos sigue siendo propuesta, no nueva opción habilitada.

Validación: TypeScript; 420 imágenes SVG combinando familias/fuentes/recursos; validación y roundtrip de preferencias; exclusión de recursos; precedencia sobre familia; pruebas existentes de personalización y layout; cuatro PNG reales de Remotion dentro/fuera del evento, en vertical/horizontal. Se inspeccionaron los PNG activos. Navegador: cero video/audio y animaciones SVG, ampliación/cierre, preferencias seleccionadas conservadas en el paso dos y resumen del paso cuatro, consola sin errores. No se subió material nuevo ni se generó un MP4 en esta iteración; la prueba temporal y de voz del nuevo efecto con raw real y aprobación estética siguen pendientes.

Evidencia local: `work/questionnaire-resources/`.
