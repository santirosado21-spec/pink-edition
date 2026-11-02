# Variedad editorial para Cutkind

Investigación: 20 de octubre de 2026. Estado: propuesta de diseño e implementación, no catálogo nuevo ejecutable ni aprobación estética del usuario.

## Hallazgo principal

La variedad debe residir en una biblioteca visual y reglas de selección verificables. El modelo elige entre esas posibilidades según el discurso y el encargo; cambiar Claude, Qwen o Codex no crea por sí mismo nuevos recursos de render.

El repositorio contiene 8 referencias, 5 familias (Umbral, Bitácora, Estampa, Pulso, Enlace), 27 patrones y 17 reglas editoriales en `style/reference-library-v1.json`. Hay que aprovechar esa biblioteca, no empezar otra vez desde cero. En cambio, `src/OneShotVideo.tsx` reutiliza un Panel con geometría similar y entrada por desplazamiento/resorte para tarjeta, comparación, ideas y B-roll. `scripts/one_shot_worker.py` sólo propone esos cuatro tipos; su comprobación de transiciones cuenta beats, no transiciones realmente implementadas. Son limitaciones concretas del motor actual.

Las cuatro combinaciones exploradas en Figma sí tienen archivos locales y soporte en cuestionario/render. Eso no significa que cuatro estilos completos de montaje estén implementados. Tampoco significa que al usuario ya le gusten.

## Referencias investigadas y qué aprender

| Fuente | Evidencia pública | Aplicación propuesta en Cutkind |
|---|---|---|
| [CapCut: texto](https://www.capcut.com/tools/add-text-to-video) | Control de fuente, espaciado, alineación, transparencia y animación; plantillas de texto | Tratar la tipografía como composición: contraste entre título y subtítulo, alineación, bloque y aparición. Evitar limitar la personalización a elegir una familia |
| [CapCut: keyframes](https://www.capcut.com/tools/keyframe-animation) | Posición, escala, opacidad y curvas de movimiento | Definir movimientos por intención: revelar, comparar, conectar, enfatizar. Probar curvas y duración, sin aplicar zoom constante |
| [Jitter: catálogo](https://jitter.video/templates/) | Plantillas de texto, tarjetas, galerías, interfaces y gráficos; ejemplos como Snappy Text Stretch, The Edit: Split Reveal y The Edit: Nested Images | Ampliar el vocabulario de composición: revelado dividido, capas de imágenes y texto cinético. Esos nombres son referencias, no nombres de producto que copiar |
| [Mixkit: títulos](https://mixkit.co/free-premiere-pro-templates/titles/) | Biblioteca de títulos para Premiere Pro | Estudiar jerarquía, placas de capítulo y rótulos; implementar versiones propias para Remotion |
| [Mixkit: Zoom Transition](https://mixkit.co/free-premiere-pro-templates/zoom-transition-131/) | Zoom hacia adentro con desenfoque en bordes | Variante puntual para material de apoyo dinámico, desactivada sobre frases serenas |
| [Mixkit: Twirling Bokeh](https://mixkit.co/free-premiere-pro-templates/twirling-bokeh-transition-471/) | Transición con bokeh y giro de foco | Referencia de transición óptica para viajes o atmósfera; no receta predeterminada para conversación |
| [Motion Array](https://motionarray.com/motion-graphics-templates/) | Catálogo de motion graphics y tipografía dinámica | Referencias para cifras, anotaciones, llamadas y demostraciones de producto |
| [MotionElements](https://www.motionelements.com/) | Plantillas, footage y música | Fuente adicional para comparar acabados y candidatos a recursos; revisar formato/licencia por recurso |
| [Fontshare](https://fontshare.com/) | Catálogo de familias y combinaciones | Ampliar candidatos tipográficos más allá de las familias ya instaladas |

Alcance: revisión de páginas oficiales, descripciones de recursos y catálogos. No se ha reproducido y medido cuadro a cuadro cada plantilla de esos sitios; no se atribuyen timings medidos ni calidad validada a esas referencias. Las recomendaciones siguientes son decisiones de diseño propias.

## Selección tipográfica

Mantener un máximo de dos familias por receta: una para títulos y otra legible para subtítulos. Una cursiva de acento pertenece a una familia o sustituye el título en momentos puntuales; no añadir una tercera porque sí.

| Propuesta | Títulos | Subtítulos | Uso y estado |
|---|---|---|---|
| Editorial cálido | DM Serif Display | DM Sans | Reflexiones y argumentos. Implementado como combinación tipográfica, pendiente de aprobación estética |
| Cine íntimo | Cormorant Garamond SemiBold Italic | Manrope | Emoción e historias; cursiva sólo en frases breves. Implementado como combinación |
| Revista | Bodoni Moda | Manrope | Títulos breves con contraste; comprobar trazos finos en móvil. Implementado como combinación |
| Documental moderno | Space Grotesk | DM Sans | Explicaciones, cifras y contexto. Implementado como combinación |
| Candidato editorial | Gambetta | General Sans | Investigar con muestras y revisión de licencia antes de incorporar |
| Candidato de impacto | Clash Display | General Sans | Títulos cortos con carácter; pendiente de muestras y licencia |

Páginas de candidatos: [Gambetta](https://www.fontshare.com/fonts/gambetta), [General Sans](https://www.fontshare.com/fonts/general-sans), [Clash Display](https://www.fontshare.com/fonts/clash-display). Sus páginas dependen de JavaScript y el lector web no devolvió muestras completas. No se consideran aprobadas ni incorporadas. La ficha indexada de Clash Display describe su contraste de trazo y su licencia ITF; no equiparar esa licencia automáticamente con OFL.

Comparar cada candidata con las mismas frases, pesos, encuadre y duración: una frase corta, otra larga, cifras, acentos, eñes y pregunta. Muestras en 9:16 y 16:9. Registrar la pareja exacta, peso, tamaño, interlineado, tracking, posición y archivo. El selector debe mostrar una mini escena animada, no sólo el nombre o una captura del tipo de letra.

## Cinco familias completas, basadas en nuestra biblioteca

| Familia existente | Personalidad | Recursos propios propuestos | Evitar |
|---|---|---|---|
| Umbral | Cinematográfica y reflexiva | Título de dos voces, revelado con máscara, imagen de detalle, cierre luminoso, movimiento lento | Rebote frecuente, flashes y karaoke permanente |
| Bitácora | Cercana y cotidiana | Hora/lugar, etiquetas pequeñas, montaje de detalles, sonido ambiente, captions discretos | Vestir una experiencia cotidiana como una presentación corporativa |
| Estampa | Editorial y material | Citas con jerarquía, recortes de papel, tipografía serif, subrayado, mosaico | Usar siempre la misma tarjeta redondeada o llenar el encuadre de texto |
| Pulso | Enérgica y tipográfica | Frase construida por bloques, énfasis de palabra, corte por acción, escala puntual | Animar todas las palabras o acelerar la voz |
| Enlace | Explicativa y demostrativa | Callout vinculado a objeto, antes/después, proceso, comparación, captura real | Gráficos decorativos o imágenes que no demuestren lo dicho |

Cada familia necesita su propia combinación de letra, composición, movimiento, color, música y sonido. No basta cambiar el color del mismo Panel. Una marca puede tener varias familias autorizadas según el formato; el usuario decide cuál usa cada encargo antes de subir.

## Primera biblioteca: 24 recursos propios a implementar

Estos son objetivos de construcción, no funciones terminadas. Reutilizar los patrones existentes cuando coincidan.

| Grupo | Variantes | Condición de uso |
|---|---|---|
| Texto (6) | Revelado por líneas; máscara; acento de palabra; cita editorial; subrayado dibujado; rótulo de capítulo | Cada variante debe mejorar una idea concreta; no animar por llenar tiempo |
| Gráficos (6) | Comparación; cifra contextual; línea de tiempo; causa/efecto; antes/después; mapa de ideas | Exigir datos o relaciones explícitos; una lista no se convierte automáticamente en gráfico estadístico |
| B-roll (4) | Inserto completo; pantalla dividida; detalle con llamada; mosaico breve | Pertinencia comprobada por clip y momento. Inserto completo conserva audio y debe estar permitido por el estilo |
| Transiciones (4) | Corte por acción; wipe con máscara; enfoque suave; zoom breve con blur | Necesitan dos escenas compatibles; corte por acción requiere observar movimiento real |
| Textura y sonido (4) | Papel; grano suave; gesto sonoro breve; ambiente continuo | Textura opcional; sonido con motivo, nivel y licencia. Mantener la voz inteligible |

El video del rostro no se recorta ni se cubre por defecto. Un B-roll a pantalla completa reemplaza deliberadamente la imagen durante un intervalo autorizado; no es un overlay que cae encima de la cara. La música requerida sigue presente, con nivel ajustado a voz. Los mínimos actuales (2 tarjetas, 2 gráficos, 2 B-rolls, música y transiciones) siguen vigentes; si falta evidencia para un recurso se informa, sin inventar contenido.

## Cómo evitar que el modelo vuelva a una receta genérica

1. Resolver primero la familia editorial y la personalidad de marca elegidas. El modelo no decide unilateralmente qué aspecto tiene la marca.
2. Analizar el discurso por unidades: tesis, dato, contraste, ejemplo, emoción, instrucción y cierre. Conservar palabras y orden de las tomas.
3. Seleccionar sólo recursos implementados y compatibles. Guardar por evento `recipeId`, `variantId`, `purpose`, `sourceWordIds`, duración, posición y recursos usados.
4. Puntuar pertinencia, claridad, compatibilidad y diversidad. La diversidad sólo desempata opciones pertinentes; nunca justifica un recurso sin relación con la frase.
5. Comparar también con las últimas ediciones aprobadas de la marca. Cambiar composiciones y B-roll cuando sea útil; conservar identidad y tipografía estable. Guardar únicamente metadatos de aprobación/preferencias autorizados, no videos temporales.
6. Reglas iniciales propuestas: no repetir la misma variante dos eventos seguidos; un foco principal por instante; respetar tiempo mínimo de lectura; movimientos fuertes sólo donde la intención lo permita. Son hipótesis a calibrar con los videos de Fran, no estándares universales.
7. Revisión de rechazo: texto tapando cara, fuente sustituida, misma geometría repetida, B-roll no pertinente, gráficos sin evidencia, clip ausente, imagen congelada inesperada y falta de audio.

No existe una garantía de gusto por especificar «no básico» en el prompt. La garantía técnica debe ser el cumplimiento del catálogo/contrato; la calidad estética se confirma comparando versiones y registrando la elección del usuario.

## Formatos y compra de recursos

CapCut sirve como referencia de técnicas. Su [acuerdo de materiales](https://www.capcut.com/clause/material-license-agreement) distingue usos y restringe edición de materiales a su plataforma; no asumir que una suscripción permite extraer su biblioteca y redistribuirla dentro de Cutkind.

Las plantillas de Premiere, After Effects o MOGRT no son componentes listos de Remotion. Usarlas como estudio, o producir un recurso exportado cuando el formato y la licencia encajen; para personalización programática necesitamos implementaciones propias parametrizadas.

[Mixkit distingue licencias por tipo de recurso](https://mixkit.co/license/), y su vídeo tiene modalidades Free y Restricted. Para un editor multiusuario, comprobar por separado uso en videos de clientes y redistribución de archivos en una biblioteca. No incorporar recursos a granel basándose en la palabra «gratis». Jitter declara uso comercial de sus templates, pero su galería también incluye marcas/obras de terceros; esa declaración no convierte todas las imágenes de muestra en stock reutilizable.

Para la siguiente prueba no hace falta comprar una suscripción: trabajar con las fuentes locales existentes, gráficos propios y material autorizado. Evaluar una compra cuando haya un recurso concreto que falte, licencia compatible y una prueba de integración. No comprar cientos de efectos esperando que resuelvan la dirección editorial.

## Implementación priorizada y prueba

P0: corregir el contrato de transiciones para contar efectos reales; mantener controles de presencia e imagen/audio por toma. El problema de la segunda toma original sigue pendiente de reprocesar los archivos expirados.

P1: extender el brief con `editorialFamilyId`, separar títulos/subtítulos/composición y conectar un registro de variantes con el renderer. El plan debe rechazar cualquier `variantId` inexistente. Introducir primero seis recursos, dos por cada una de tres familias elegidas para la prueba.

P2: conectar los patrones restantes, gestión de assets/licencias y puntuación semántica. Registrar aprobación/rechazo de recursos para la personalización, sin alterar retroactivamente el brief de un video.

P3: generar tres versiones de los mismos 20–30 segundos de material autorizado: Umbral, Estampa y Pulso. Mantener discurso, orden, volumen y datos idénticos. Comparar carácter, claridad, ritmo, pertinencia, legibilidad y variedad. No considerar aprobada una familia porque pasa TypeScript o porque aparecen seis fuentes.

Criterios de aceptación: cada toma tiene imagen y voz; cada gráfico tiene una frase que lo justifica; no hay texto cortado ni sobre la cara; fuentes reales coinciden con el brief; las tres versiones difieren en composición y movimiento; cada clip stock tiene procedencia; todos los recursos solicitados están presentes o el resultado queda incompleto. Una revisión final debe recorrer las uniones y todos los eventos, no sólo capturas bonitas.

Entregado en esta investigación: comparación de fuentes, propuestas tipográficas, mapa de 24 recursos, diagnóstico del código y orden de implementación. No se ha conectado esta propuesta al selector automático ni se han comprado o importado bibliotecas externas.
