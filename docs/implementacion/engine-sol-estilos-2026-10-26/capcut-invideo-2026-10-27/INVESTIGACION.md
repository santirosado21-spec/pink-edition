# CapCut e InVideo: patrones para el motor local

Fecha: 27 de octubre de 2026. Aplicaciones seleccionadas expresamente por el usuario. Resultado: primera investigación con REA, observación de interfaz y fuentes oficiales; catálogo de diez recetas originales con estado de implementación explícito.

## Resultado útil para Cutkind

Las referencias sugieren separar cuatro decisiones que nuestro piloto mezcla: familia editorial, tipografía, tratamiento de captions y cantidad/presentación de recursos. El usuario debería escogerlas antes de procesar y poder cambiar cada una sin que el motor vuelva a imponer todas las demás.

CapCut aporta una referencia clara de catálogo y ajuste manual. InVideo aporta una referencia de dirección mediante instrucciones y estilos de captions por finalidad. La combinación recomendada es un brief visual con muestras comparables, seguido de decisiones de Sol que respeten las opciones y produzcan un manifiesto editable.

## Qué se investigó realmente

### CapCut

No se encontró una instalación de CapCut en las rutas estándar comprobadas. Se abrió su editor web como invitado. Se observaron paneles separados de texto, captions, transcripción, transiciones y marca. Texto distingue plantillas y efectos y ofrece acciones diferentes para títulos y cuerpo. Captions ofrece reconocimiento, entrada manual e importación de archivos. Transiciones muestra familias, ejemplos y la instrucción de colocar un recurso entre dos clips.

Se capturaron nueve scripts públicos de la página y su localización, unos 6,38 MB, y se analizaron como texto inerte con REA. El módulo de localización contiene identificadores para énfasis de palabras, estilos de captions, tipografías de marca y presets de texto. Esto es evidencia estática de etiquetas y conceptos disponibles en el cliente; no prueba que cada función esté habilitada ni que use un algoritmo determinado.

Fuentes complementarias: [tipos de captions](https://www.capcut.com/resource/types-of-captions) y [guía de subtítulos](https://www.capcut.com/resource/how-to-add-subtitle-in-capcut). CapCut documenta opciones desde captions discretos hasta énfasis y sincronización por palabra, además de personalización de fuente, color y posición. No se midieron las curvas ni los tiempos de sus animaciones.

### InVideo

La aplicación redirigió a registro. Se observó esa pantalla, no el editor autenticado. Se capturaron once scripts públicos, unos 579 KB, y se analizaron con REA. Esa muestra no establece cómo funciona internamente el montaje ni permite comprobar el resultado de sus estilos.

La [guía oficial de captions](https://invideo.io/blog/how-to-add-captions-to-videos/) documenta tratamientos de énfasis, trazo, contraste, movimiento, combinación tipográfica y profundidad. Esto permite proponer controles y recetas, pero no atribuirles mediciones o implementación interna. La [presentación oficial del editor](https://invideo.io/editor/) describe B-roll contextual, edición en timeline, transiciones por familias y ajustes de sonido y tipografía; su disponibilidad y resultado no se comprobaron en la cuenta del usuario.

## Evidencia REA y límites

| Aplicación | Evidencia principal | Artefacto capturado |
|---|---|---|
| CapCut | `ev_f4adec408418dd69a06f9fcfd25bbd5a92098b251834ee3f47346126015c0c2f` | SHA-256 `357c690724b7762091f467490f66625d833cd4784d7e64b2034f0f3e5f98e6af` |
| InVideo | `ev_51dd0235c32ad8bc66bc960d424b73c9cc9012a0a70b238f5548be518aeed981` | SHA-256 `77c176cc60fe40f1029bf14d2a165ea59c115cb1a68c86bf84f1bc320a7d101f` |

REA analizó nueve archivos JavaScript en CapCut y once en InVideo, sin fallos de parseo reportados. La cobertura semántica de ambos grafos fue **parcial**: hubo límites de memoria, presupuesto del grafo y expresiones dinámicas. No se repitió el análisis completo para intentar esconder esas limitaciones. Se inspeccionaron vistas de módulos retenidas. Una búsqueda literal en el grafo de CapCut no encontró una etiqueta de transiciones que sí estaba en el archivo capturado; se registró como búsqueda negativa acotada, no como ausencia de la función.

El [registro de evidencia](REA-EVIDENCE.json) conserva IDs, hashes, cobertura, limitaciones y el alcance de las observaciones de interfaz. [CAPTURE-MANIFEST.json](CAPTURE-MANIFEST.json) registra procedencia y hashes de los scripts. Los originales capturados permanecen fuera del repositorio, en `/tmp/cutkind-rea-capcut-invideo-20261027/`.

Estas observaciones no constituyen recuperación del editor completo, de su servidor, sus modelos, pesos, plantillas ni activos gráficos. No se subieron grabaciones del usuario, generaron videos en esas plataformas ni consumieron créditos de edición.

## Diez recetas originales especificadas

| Receta | Familia inicial | Decisión del usuario | Lo que falta para probarla en el motor |
|---|---|---|---|
| Palabra clave limpia | Enlace | Énfasis semántico discreto | Sol debe devolver IDs de palabras y el renderer aplicarlos |
| Subrayado a mano | Estampa | Trazo y color de acento | Adaptar el subrayado de tarjetas a captions |
| Contraste durante el habla | Bitácora | Color activo sin fondo karaoke | Tratamiento diferenciado y contraste legible |
| Jerarquía con dos tipografías | Estampa | Título y subtítulo por función | Exponer ambas elecciones manteniendo las parejas existentes |
| Revelado por frase corta | Pulso | Cantidad de palabras y movimiento | Agrupar por pausas y sincronizar la aparición |
| Unión editorial discreta | Umbral | Intensidad o ausencia de transición | Respetar desactivación y continuidad entre tomas |
| Cambio con movimiento breve | Pulso | Acercamiento o barrido permitido | Limitar densidad y elegir uniones con intención |
| B-roll que explica la frase | Enlace | Banco, propio, ambos o desactivado | Material propio y recursos opcionales sin cuota fija |
| Toma y contexto en paralelo | Bitácora | Panel dividido o enmarcado | Selección de layout por video y composición segura |
| Acentos de sonido con propósito | Pulso | Sin efectos, suaves o presentes | Pistas de sonido por evento con ganancia y procedencia |

El [catálogo estructurado](../../../../style/research/capcut-invideo-patterns-v1.json) registra fuentes, recursos existentes, componentes pendientes y aceptación por receta. Todos sus patrones están marcados `specified-not-integrated`: no son diez efectos nuevos ya instalados. Las duraciones, límites y proporciones propuestos son decisiones originales de Cutkind; no se presentan como parámetros extraídos de los competidores.

## Preferencias antes de editar

1. Elegir una familia entre Umbral, Bitácora, Estampa, Pulso y Enlace, con la misma grabación de muestra para comparar.
2. Elegir tipografía o pareja, peso y jerarquía. Conservar el cambio manual aunque la familia sugiera otra combinación.
3. Elegir tratamiento de captions y nivel de énfasis. Mostrar también frases largas, acentos y cifras.
4. Elegir ritmo y movimiento, incluidas transiciones desactivadas.
5. Elegir B-roll: desactivado/selectivo/frecuente; origen y forma de presentación. Pedir archivos propios cuando correspondan.
6. Elegir música y efectos con muestras y control de intensidad.
7. Confirmar un resumen que viaje copiado al trabajo antes de invocar a Sol.

Sol recibe estas preferencias, la transcripción con IDs y los recursos disponibles. Propone variantes implementadas, justifica el anclaje al discurso y deja la toma original cuando un recurso no ayuda. Los eventos se validan antes del render. La elección de una familia no autoriza a inventar comparaciones ni a llenar cuotas de efectos.

## Primera implementación recomendada

Priorizar palabra clave limpia, contraste durante el habla y jerarquía tipográfica. Son mejoras visibles que aprovechan tiempos de palabras y fuentes ya existentes. Después, retirar los mínimos obligatorios del piloto y conectar el control de B-roll, transiciones y sonidos. Finalmente añadir variantes más expresivas cuando las pruebas de lectura y composición lo justifiquen.

Se posponen texto detrás de la persona y captions que recorren toda la pantalla: exigen segmentación o composición temporal segura que todavía no se comprobó. La disponibilidad de un estilo en otra aplicación no demuestra que funcione bien en nuestra grabación.

## Aceptación local

- Misma grabación, voz, orden y transcripción para comparar versiones.
- Al menos una variante sobria, una editorial y una dinámica con diferencias reales de composición y movimiento.
- Preferencias consistentes entre resumen, muestra, preview y MP4.
- Sin gráficos/B-roll/sonidos significa cero eventos de ese tipo y no bloquea una entrega válida.
- Todos los recursos tienen procedencia y cada efecto un anclaje temporal comprobable.
- Registrar por separado QC técnico y aprobación estética del usuario.
- Mantener inferencia editorial con Sol y ejecución del producto local; posponer servidor hasta superar estas comprobaciones.

La verificación de esta investigación consistió en contrastar fuentes, registrar el alcance REA y validar los diez IDs, sus fuentes y sus familias contra el catálogo existente. No se ha modificado el renderer ni se ha exportado un MP4 nuevo como parte de esta investigación.
