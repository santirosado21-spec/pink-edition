# Pink.ai: catálogo editorial de tarjetas

Este catálogo reúne 13 tipos: seis nuevos independientes del tema y siete existentes de estrés/salud. Describe decisiones del PLAN y pictogramas vectoriales sobre paneles liquid glass detrás de la persona; no fotos, datos inventados ni gráficos clínicos. Cada tarjeta debe mejorar una frase concreta, justificarla con `meaning` y dejar rostro y captions libres. No hay cuota mínima de tarjetas.

Fuentes: [reglas de edición](EDITING_GUIDELINES.md), `../schema/edit-plan.schema.json`, `../src/graphics/cards.tsx`, `../style/pink-demo-v1.json`, `../projects/piscina/plan.json`, `../CLAUDE.md` y `../../METODOLOGIA.md`. Las formas y animaciones de los siete existentes proceden del registro; los temas por defecto siguen las reglas y los ejemplos del plan. `illness` está registrado pero no tiene evento de tarjeta en ese plan.

**Estado del contrato:** `compare`, `steps`, `beforeafter`, `alert`, `counter`, `question` y el campo `text` ya están implementados en `src/graphics/cards.tsx` y admitidos por `schema/edit-plan.schema.json` (revisados en frames, el 9 de octubre de 2026). Lo que sigue sin implementarse son las reglas editoriales propuestas (densidad, duraciones mínimas): son criterio de revisión, no validaciones.

## Reglas comunes

- Entrada y `beat` se resuelven con `frame(palabra) + offset_frames`; el componente recibe el `beat` relativo al inicio de la tarjeta. Debe quedar dentro de ella. `sample_frame` es sólo fallback de desarrollo. Cada uno de los seis nuevos anima su énfasis con `beat`, salvo `steps`, que lo usa para terminar de llenar la línea.
- Tema por evento: `base` (azul) para contexto general/reflexión; `health` (verde) para salud, médico y sanar; `stress` (rojo) para estrés, emergencia, enfermedad como amenaza y riesgo; `money` (ámbar) para dinero, ahorro, precios y negocios; `tech` (violeta) para tecnología, internet e inteligencia artificial. El tema depende de la frase completa, no del nombre de la tarjeta ni de una palabra aislada. Los valores por defecto de abajo son criterios editoriales; no hay selector semántico automático. Ante ambigüedad, revisar el contexto.
- **Duración mínima propuesta: 43 frames por tarjeta**, reutilizando el menor valor observado en las reglas. No es un mínimo implementado ni garantía de lectura: el esquema exige sólo duración positiva. Conservar la frase completa, dejar terminar el énfasis y revisar salida; STYLE tiene entrada de 12 y salida de 9 frames. Ampliar la duración cuando la secuencia o la voz lo requieran; no hay evidencia para fijar otro piso numérico por tipo.
- `text` es un campo opcional del PLAN propuesto, condicionado al tipo: para `counter` debe contener la cifra objetivo como cadena corta, por ejemplo `"3"` o `"10"`; para los otros doce se omite. No es un título, caption, CTA ni sustituto de `label` o `meaning`. Si falta una cifra exacta hablada, no usar `counter`; no inferir cantidades ni completar un valor por defecto.
- Animar con frames de Remotion, sin reloj CSS ni saltos bruscos de escala. Mantener Inter Display Bold y tamaño uniforme para los elementos tipográficos. No asignar las mismas palabras a dos énfasis principales ni solapar tarjeta y corte de color. Revisar colocación, lectura y escucha por separado del QC técnico.

## `compare`

- **Dibuja:** dos barras horizontales, una claramente más larga; sin números, ejes ni escala. La diferencia es cualitativa, no una proporción medida.
- **Justifica:** «gasto más en transporte que en comida», «este equipo es más rápido que el anterior», «necesito menos tiempo». Deben estar claros los términos de la comparación en el discurso.
- **No justifica:** «esto es bueno», «quiero mejorar» o dos objetos nombrados sin comparación. No convertir la longitud en un porcentaje o un 2× no dicho.
- **`beat`:** enfatizar la diferencia al pronunciar «más», «menos», «mayor» o «rápido», según la frase; conservar clara la dirección de la comparación.
- **Tema por defecto:** `base`; cambiar a `health` para comparación de salud/sanación o a `stress` para estrés/riesgo, según la regla común.
- **Duración mínima:** 43 frames propuestos; ampliar si los dos términos y el énfasis no caben con salida legible.
- **`text`:** omitir; no mostrar cifras ni etiquetas añadidas.

## `steps`

- **Dibuja:** tres puntos o pasos redondeados que aparecen en secuencia sobre una línea.
- **Justifica:** «primero organizo, luego escribo y finalmente reviso» o un proceso descrito en tres movimientos, aunque no use esos conectores.
- **No justifica:** una lista sin orden, sólo dos acciones o un proceso de cuatro pasos. No inventar una tercera etapa ni resumir cuatro como tres.
- **`beat`:** enfatizar el paso decisivo o la conclusión hablada; acompasar las tres apariciones a las acciones. Hay un solo `beat`, no tres anclajes de énfasis nuevos en el PLAN.
- **Tema por defecto:** `base`; usar `health` para un proceso de salud/sanación y `stress` para una secuencia de emergencia/riesgo explícita.
- **Duración mínima:** 43 frames propuestos; extender hasta cubrir las tres acciones y permitir leer la secuencia completa, sin acelerar la voz.
- **`text`:** omitir; no añadir nombres o números a los pasos.

## `beforeafter`

- **Dibuja:** dos paneles con una flecha entre ellos; representa paso de un estado a otro, sin fotos ni resultados cuantificados.
- **Justifica:** «pasé de tener archivos dispersos a guardarlos en una carpeta», «antes discutíamos; ahora nos escuchamos». Ambos estados deben estar en la voz.
- **No justifica:** «quiero cambiar» sin destino descrito, dos alternativas sin transformación o una mejora física que el hablante no afirmó.
- **`beat`:** marcar la llegada al estado nuevo sobre la palabra que lo define; hacer legible el estado anterior antes de la transición.
- **Tema por defecto:** `base`; `health` si la transformación habla de sanar, `stress` si describe un cambio hacia estrés o amenaza.
- **Duración mínima:** 43 frames propuestos; ampliar para leer ambos estados y la transición durante la frase completa.
- **`text`:** omitir; no inventar rótulos «antes/después» ni valores.

## `alert`

- **Dibuja:** triángulo de advertencia con signo de exclamación; sin columna de presión ni cifras.
- **Justifica:** «cuidado con compartir tu contraseña», «este error puede borrar tus archivos», «no ignores ese peligro».
- **No justifica:** una novedad neutral, una preferencia personal o un consejo sin advertencia, error o peligro explícito.
- **`beat`:** enfatizar el signo al nombrar el error, peligro o advertencia; sin convertir el pulso en una alarma clínica.
- **Tema por defecto:** `stress` para peligro/riesgo explícito; `base` para un error cotidiano sin amenaza y `health` para una precaución sanitaria cuyo contexto sea cuidado, según revisión de la frase.
- **Duración mínima:** 43 frames propuestos; cubrir la advertencia y su énfasis.
- **`text`:** omitir; no agregar avisos escritos que no aparecen en la voz.

## `counter`

- **Dibuja:** una cifra grande con conteo ascendente hasta el objetivo de `text`. Los valores intermedios son transición visual, no datos adicionales; no añadir unidades, porcentajes, series ni estadísticas.
- **Justifica:** «te voy a enseñar tres ejercicios» con `text: "3"`, «tengo diez minutos» con `text: "10"`. La cifra final debe haberse pronunciado exactamente; escribir «tres» como `"3"` conserva ese valor.
- **No justifica:** «varios ejercicios», «muchísimo dinero», una cifra calculada a partir de otras o un objetivo ausente de la voz. Sin `text` verificable, no usar la tarjeta.
- **`beat`:** hacer coincidir la llegada a la cifra final con la palabra que la pronuncia; el conteo no debe sugerir un crecimiento real no narrado.
- **Tema por defecto:** `base`; `health` para cantidades en contexto de salud/sanación y `stress` para cifras de estrés/riesgo explícito. Una cifra por sí sola no determina tema.
- **Duración mínima:** 43 frames propuestos; dar tiempo al conteo y a leer el objetivo. Si el anclaje no lo permite, omitir la tarjeta.
- **`text`:** opcional a nivel general del PLAN, obligatorio al elegir `counter`; cadena corta con la cifra exacta hablada, sin redondear ni estimar. No hay valor por defecto. Los formatos distintos de los ejemplos enteros requieren definir soporte antes de usarlos; no asumir decimales, signos o monedas implementados.

## `question`

- **Dibuja:** un signo de interrogación grande con un pulso.
- **Justifica:** «¿por qué siempre dejamos esto para mañana?» o «todavía no sabemos qué pasó»: pregunta retórica o misterio planteado por el hablante.
- **No justifica:** una afirmación cerrada, una pausa sin pregunta ni misterio o una duda añadida por el editor.
- **`beat`:** colocar el pulso en la palabra que concentra la pregunta o incógnita; no repetirlo por cada palabra.
- **Tema por defecto:** `base`; `health` para una pregunta de salud/sanación y `stress` para una incógnita sobre amenaza o estrés explícitos.
- **Duración mínima:** 43 frames propuestos; cubrir el planteamiento y el pulso.
- **`text`:** omitir; el signo pertenece al pictograma, no al campo `text`.

## `patients`

**Existente; tema: estrés/salud, usar sólo si la frase lo ilustra literalmente.**

- **Dibuja:** cuatro personas en círculos; la primera tiene acento y recibe un aro de énfasis.
- **Justifica:** «uno de cada cuatro pacientes» en contexto médico, con esa proporción realmente hablada.
- **No justifica:** «muchos pacientes», «uno de cada tres» ni una mención genérica a personas. Las cuatro figuras no son evidencia independiente.
- **`beat`:** revela el aro de la primera persona; en el código progresa desde `beat` hasta `beat + 14`. Anclar al énfasis de la proporción.
- **Tema por defecto:** `health`, como en el plan de piscina; `stress` sólo si la frase sitúa esa proporción en una amenaza de salud. No reutilizar como estadística general.
- **Duración mínima:** 43 frames propuestos, duración observada de esta tarjeta en el plan; revisar que el aro y la salida se lean.
- **`text`:** omitir; no cambia el número fijo de personas.

## `emergency`

**Existente; tema: estrés/salud, usar sólo si la frase lo ilustra literalmente.**

- **Dibuja:** triángulo con exclamación, columna ascendente sin escala ni cifras y flecha hacia arriba.
- **Justifica:** una frase sobre modo de emergencia y aumento de presión, como el significado documentado en el plan de piscina.
- **No justifica:** «cuidado con ese correo» o una emergencia sin aumento descrito que sustente la columna; usar `alert` si basta una advertencia general.
- **`beat`:** eleva la columna y revela la flecha desde `beat` hasta `beat + 12`; el anclaje documentado corresponde a «presión».
- **Tema por defecto:** `stress`, por emergencia/amenaza; `health` sólo si el contexto completo corresponde a cuidado sanitario y sigue justificando ambos símbolos.
- **Duración mínima:** 43 frames propuestos; cubrir emergencia, presión y salida sin recortar la frase.
- **`text`:** omitir; no añadir mediciones a la columna.

## `risk`

**Existente; tema: estrés/salud, usar sólo si la frase lo ilustra literalmente.**

- **Dibuja:** dos barras; la segunda crece hasta el doble de la primera, junto a un `2×` fijo.
- **Justifica:** «se duplica el riesgo» en salud; la relación exacta debe estar dicha.
- **No justifica:** «aumenta el riesgo», «es más probable» o «crece un poco». Para una comparación cualitativa usar `compare`, sin introducir un doble.
- **`beat`:** hace crecer la segunda barra desde `beat` hasta `beat + 14`; anclar a «duplica» o su equivalente hablado.
- **Tema por defecto:** `stress`, como en el plan, por riesgo/amenaza; revisar cualquier otro encuadre sanitario antes de seleccionar `health`.
- **Duración mínima:** 43 frames propuestos; permitir ver el crecimiento y la proporción final.
- **`text`:** omitir; el `2×` está fijado en el componente y no se puede cambiar con este campo.

## `illness`

**Existente; tema: estrés/salud, usar sólo si la frase lo ilustra literalmente.**

- **Dibuja:** líneas onduladas que se atenúan, flecha y cruz médica dentro de un círculo; representa el paso de sensación a enfermedad.
- **Justifica:** «no es sólo una sensación pasajera, es una enfermedad», si ese contraste está en la voz.
- **No justifica:** «me siento raro» sin enfermedad nombrada ni una transformación ajena a salud. No usar como diagnóstico añadido.
- **`beat`:** atenúa las ondas y revela flecha/cruz desde `beat` hasta `beat + 14`, al nombrar la enfermedad.
- **Tema por defecto:** `stress` para enfermedad como amenaza; es un criterio editorial acorde con las reglas, no un evento existente de esta tarjeta. Usar `health` si predomina explicación/cuidado sanitario.
- **Duración mínima:** 43 frames propuestos; ampliar si el contraste y la revelación necesitan más tiempo.
- **`text`:** omitir; no añadir diagnósticos ni nombres de enfermedades.

## `body`

**Existente; tema: estrés/salud, usar sólo si la frase lo ilustra literalmente.**

- **Dibuja:** dos bustos y una flecha; la cabeza izquierda pulsa y el cuerpo derecho se llena de acento.
- **Justifica:** «pasa de la cabeza al cuerpo» en una explicación de estrés/salud que describa esa relación.
- **No justifica:** «entrena el cuerpo» sin relación cabeza/cuerpo ni una transferencia entre personas. No es un mapa fisiológico.
- **`beat`:** llena el cuerpo derecho y refuerza la flecha desde `beat` hasta `beat + 18`; en el plan se asocia a «cuerpo». El pulso de la cabeza depende del frame.
- **Tema por defecto:** `stress`, como en el plan; `health` si la frase describe salud/cuidado sin amenaza y conserva la relación ilustrada.
- **Duración mínima:** 43 frames propuestos; extender para cubrir la relación hablada y terminar el llenado antes de salir.
- **`text`:** omitir; no rotular órganos ni añadir medidas.

## `healing`

**Existente; tema: estrés/salud, usar sólo si la frase lo ilustra literalmente.**

- **Dibuja:** dos anillos con cruces médicas, uno que se completa pronto y otro que avanza despacio; sin cifras.
- **Justifica:** «tardas más en sanar» o una comparación explícita de velocidad de sanación.
- **No justifica:** «estoy sano», una promesa de cura no grabada o una comparación de velocidad tecnológica. Los arcos no representan porcentajes clínicos.
- **`beat`:** se conserva en el PLAN como anclaje editorial, pero la animación existente usa `duration` y no `beat`. STYLE incluye `healing` en `audio.card_beat_sfx.silent_kinds`: no tiene sonido de énfasis; no asumir que un nuevo anclaje cambiará esa animación.
- **Tema por defecto:** `health`, como en el plan y la regla de sanar; usar `stress` sólo si la frase completa se encuadra como amenaza, sin alterar el significado de los anillos.
- **Duración mínima:** 43 frames propuestos; revisar el contraste de velocidades durante toda la duración y ampliar si no se lee.
- **`text`:** omitir; no añadir tiempos de recuperación ni porcentajes.

## `bill`

**Existente; tema: estrés/salud, usar sólo si la frase lo ilustra literalmente.**

- **Dibuja:** recibo que se despliega, filas abstractas y barra de total; sin importes.
- **Justifica:** «el estrés te va a cobrar la factura», como imagen verbal explícita del cierre de piscina. La frase debe nombrar la factura/cobro que el pictograma ilustra; no inferir un gasto médico real de esa metáfora.
- **No justifica:** «habrá consecuencias» sin factura/cobro nombrado, una cifra de deuda o cualquier tema de dinero por asociación. No generalizar este tipo temático a todo video financiero.
- **`beat`:** revela y extiende la barra de total desde `beat` hasta `beat + 10`; en el plan se asocia a «factura».
- **Tema por defecto:** `base`, como la reflexión de cierre del plan; `stress` si predomina amenaza y `health` si el contexto es cuidado médico. La etiqueta temática del catálogo no fuerza el color.
- **Duración mínima:** 43 frames propuestos; revisar despliegue, total y salida.
- **`text`:** omitir; no añadir importes ni convertir las filas en datos.

## Decisión: frase hablada → tarjeta

Ejemplos editoriales ficticios, no citas del material del cliente. Cada elección queda condicionada a escuchar esa frase, resolver sus anclajes y comprobar espacio y duración; no obliga a insertar la tarjeta.

| Tema | Frase hablada | Tarjeta / tema / `text` | Criterio y énfasis |
| --- | --- | --- | --- |
| Dinero | «Este mes gasté más en transporte que en comida». | `compare` / `base`; omitir `text`. | Comparación explícita; `beat` en «más», sin proporción numérica. |
| Dinero | «Tengo varios gastos pendientes». | **Sin tarjeta.** | No hay cantidad exacta para `counter` ni comparación; no inventar una factura. |
| Fitness | «Te voy a enseñar tres ejercicios». | `counter` / `base` / `text: "3"`. | Llegar a 3 en «tres»; ejercicio general no implica automáticamente tema médico. |
| Fitness | «Me gusta salir a caminar». | **Sin tarjeta.** | No describe cabeza/cuerpo, transformación ni comparación que justifique estos pictogramas. |
| Tecnología | «Cuidado: compartir esta contraseña deja tu cuenta expuesta». | `alert` / `stress`; omitir `text`. | Advertencia de riesgo explícito; `beat` en «expuesta». |
| Tecnología | «Pasamos de guardar todo en un solo equipo a sincronizarlo entre dispositivos». | `beforeafter` / `base`; omitir `text`. | Dos estados narrados; énfasis al llegar a «sincronizarlo». |
| Tecnología | «Esta versión carga más rápido que la anterior». | `compare` / `base`; omitir `text`. | `beat` en «rápido»; no afirmar un 2×. |
| Productividad | «Primero anoto las tareas, luego elijo una y finalmente la termino». | `steps` / `base`; omitir `text`. | Tres acciones ordenadas; énfasis en «termino». |
| Productividad | «Tengo diez minutos para revisar el borrador». | `counter` / `base` / `text: "10"`. | Llegar a 10 en «diez»; no convertir el pictograma en cronómetro. |
| Relaciones | «¿Por qué nos cuesta tanto pedir perdón?». | `question` / `base`; omitir `text`. | Pregunta retórica; pulso en «perdón». |
| Relaciones | «Antes discutíamos por todo; ahora nos escuchamos». | `beforeafter` / `base`; omitir `text`. | Transformación explícita; `beat` en «escuchamos». |
| Relaciones | «Ayer hablé con mi hermana». | **Sin tarjeta.** | Relato neutral sin una relación visual de este catálogo; no añadir misterio ni conflicto. |
