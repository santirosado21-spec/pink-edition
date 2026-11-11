# Uso y límites de la mejora editorial

## Probar en el estudio local

Abre `http://localhost:3000/app?new=1`. Elige un preset y abre **Afinar estilo (opcional)**. Hay controles de presencia, lectura, énfasis, recursos, encuadre, texto visible y aspectos de referencia. El brief confirmado congela la elección. Las sesiones antiguas conservan su configuración; **Actualizar a estilo nuevo** habilita las opciones antes de crear otro encargo.

Los ejemplos del cuestionario son SVG estáticos. El color de tu marca modifica el export, no los controles Cutkind. El preset Impacto solicita explícitamente intertítulos; presencia o frecuencia no conceden por sí solas permiso para cubrir la imagen con texto.

**Texto visible:** «Subtítulos literales» mantiene las páginas habladas sin cards extra; «Ideas clave» muestra solo los extractos editoriales seleccionados; «Ambos» combina titular y subtítulos, suprimiendo duplicados. En los tres modos se mantienen el audio y los tokens/timestamps de la transcripción. La elección de ideas clave no promete que cada palabra esté visible.

## Referencias

En **Tu marca y referencias**, carga el video anterior, pulsa analizar y marca los patrones observados que quieras recordar. En la dirección editorial nueva, elige además qué aspectos usar. Se filtran por aprobación explícita, capacidad implementada, evidencia temporal y hash de origen. Una referencia nunca se añade a las tomas originales ni se reutilizan sus assets.

El cuestionario mantiene las fuentes y colores elegidos. Aprender tipografía significa aplicar reglas de jerarquía/agrupación; no copiar una fuente que no existe ni cambiarla sin elección del usuario.

## Recursos

Las exclusiones siempre tienen prioridad. El motor puede concluir que ningún apoyo es pertinente. Una banda segura no disponible activa una composición con regiones separadas, no un gráfico que tape el rostro. Sin medición se identifica el fallback; no se afirma haber medido seguridad entre todos los frames.

La biblioteca local de apoyos es una función para administrar material curado. Su formato y ejemplo están en `CURATED-MEDIA.md` y `CURATED-MEDIA.example.json`. Solo se consideran entradas declaradas y aprobadas para rol de apoyo; no se buscan automáticamente originales ni referencias. El modo «propio» impide consultar stock externo. Esta entrega no incluye una colección comercial de stock ni instala modelos de generación.

## Revisión de cada encargo

La vista previa muestra cuántos apoyos se propusieron, aplicaron y descartaron. Los detalles explican falta de material, alternativas de composición y conflictos entre lectura y tiempo disponible. Un recurso opcional ausente no se representa como un fallo técnico. La revisión estética permanece pendiente del usuario.

Los titulares se anclan a palabras reales y el contenedor sigue visible durante las pausas del ASR. En composición reservada pueden mantenerse al cambiar de original, sin mover audio ni timeline; se limita la permanencia por la siguiente propuesta y por un hold acotado de la oración. Si no hay tiempo de lectura suficiente se registra el conflicto.

## Evaluación de modelos sin cambiar proveedor

`scripts/editorial_eval.py` no llama a modelos. Genera un paquete local con hash del contexto, del contrato de render y de los archivos; comprueba propuestas importadas contra la misma transcripción y sus tiempos. La identidad del modelo se separa de las etiquetas A/B. No declara ganador estético.

```sh
python3 scripts/editorial_eval.py package /ruta/privada/edit.json \
  --media-root /ruta/privada --out work/eval/package.json
python3 scripts/editorial_eval.py compare work/eval/package.json \
  work/eval/control.json work/eval/candidate.json --out work/eval/report.json
```

Cada resultado importado lleva `packageSha256`, `model`, `edit` y, opcionalmente, `usage`, `rates` y `human`. `input_tokens` incluye `cached_input_tokens`; `output_tokens` incluye salida de razonamiento facturable. Las tarifas por millón se suministran explícitamente como `inputPerMillion`, `outputPerMillion` y opcionalmente `cacheReadPerMillion`. No hay una tarifa hardcodeada que se presente como actual. Se requiere sumar todos los intentos, render, recursos y revisión humana para medir costo por video aprobado.

El paquete contiene información privada del encargo: se conserva en `work/`, fuera de Git; el script no lo publica ni lo envía. El smoke test compara el control consigo mismo para validar el arnés; **no es una comparación Sol/Opus**. Sol sigue siendo el modelo del producto.

## Comprobaciones y límites

Se prueban contratos de preferencias, límites, fuentes, snapshots, esquemas reales de Sol, biblioteca curada y estados del renderer. El test con MP4 de pantalla completa combina pruebas estructurales con medición de cuatro esquinas por frame; esa medida no reconoce la zona central ni sustituye revisión humana. El QC de audio compara muestras por toma y niveles, no escucha semántica completa.

La integración no instala PySceneDetect, OCR, Lottie o segmentación por el hecho de estar investigados. Se implementan SVG propios y se aprovecha Remotion existente; paquetes adicionales se incorporarán cuando hagan falta para un comportamiento definido y probado.
