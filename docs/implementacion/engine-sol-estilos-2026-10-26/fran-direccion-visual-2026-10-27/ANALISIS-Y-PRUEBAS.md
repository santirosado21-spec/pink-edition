# Qué mejorar antes de cambiar de modelo

Fecha: 27 de octubre de 2026. Pruebas locales, sin despliegue ni contratación de servidor.

## Conclusión

El informe de Opus 5.5 no demuestra que Sol necesite reemplazo. Varios fallos nacían del renderer y del contrato: un gran panel encogía al protagonista, las tarjetas tenían duración mínima fija, la resolución intermedia limitaba el export, los subtítulos estaban bajos y las cuotas incentivaban recursos débiles. Cambiar de modelo no modifica esas geometrías ni recupera píxeles inexistentes.

No se ha hecho una comparación controlada entre dos modelos dirigiendo el mismo material. Antes de recomendar un cambio hay que mantener constantes grabación, brief, recursos y renderer, y comparar decisiones semánticas concretas. El motor permanece en `gpt-5.6-sol` mediante la sesión ChatGPT de Codex; no se cambiaron proveedor ni facturación. Claude Opus 5.5 se empleó en el chequeo previo, separado de la dirección del motor.

## Cambios implementados

- Proxies hasta 1920 px, con nueva versión de caché; salida 1080×1920 para el proyecto de siete originales de 1080 px de ancho. La grabación de 480×848 continúa limitada por su origen.
- Reencuadre anclado al rostro con zoom máximo 1,30× y margen para cabello. Muestreo de tres imágenes por segundo, unión de vecinos, keyframes por toma e interpolación. No es garantía de los movimientos no muestreados.
- Subtítulos más grandes, sobre el torso, con contorno/sombra y agrupación que evita acabar páginas en conectores frecuentes. Los tokens y sus tiempos se conservan. La fuente sigue la elección del brief.
- Superposiciones medidas sobre el encuadre transformado. Se puede acortar una ventana gráfica durante movimiento de preparación; no se acorta la voz para resolverlo.
- Modo natural explícito en el cuestionario: recursos pertinentes sin mínimos forzados. El modo de catálogo y los briefs históricos conservan los mínimos. Las imágenes fijas ya no cuentan como clips para satisfacer ese contrato.
- B-roll anclado a un fragmento hablado literal; selección textual y revisión de tres momentos con Sol. La rúbrica distingue ilustración de prueba estadística. Se rechazó el reloj histórico para presión cotidiana y se aceptó un clip de gente caminando para la frase correspondiente.
- Descarga de solo ocho segundos del candidato y alternativa acotada si falla uno. Se corrigieron fallos por descargar originales enteros demasiado grandes.
- API local de medios admite JPEG/PNG incluidos en el plan, con MIME y rangos correctos; mantiene bloqueados archivos no autorizados.
- Se muestran Inter y más fuentes sin ocultarlas tras la etiqueta de opciones anteriores. Las muestras de familia reflejan el nuevo tratamiento. Consejos de grabación aparecen antes de recibir archivos.
- La cola de Sol espera una solicitud activa en vez de fallar de inmediato cuando coinciden una prueba y un trabajo del usuario. Sin fallback.
- Los acentos de sonido solicitados se ligan a eventos reales con archivos Kenney CC0 existentes, niveles y duración explícitos; el modo sin efectos no crea eventos. Se probaron preparación, licencia, copia, ganancia y límites temporales con archivos reales. Las exportaciones mostradas aquí se pidieron sin efectos.
- El runner archiva evidencia por vuelta, puede reutilizar análisis ASR por hash exacto/idioma/vocabulario y revisa imágenes del export con Sol. La clasificación y el análisis editorial siguen usando Sol; el uso de caché se registra y no se presenta como inferencia nueva.

## Vueltas realizadas

1. `work/fran-loop/20261027-130424`: subida real de siete tomas de Tiempo ahorrado y del raw de Estrés. Surgieron rechazos demasiado estrictos y problemas de descarga del banco; se retuvo A-roll.
2. `work/fran-loop/20261027-131732`: nueva subida del proyecto de siete tomas; descarga parcial y ventanas seguras. La revisión confundía la capacidad ilustrativa con demostrar el 15 %.
3. `work/fran-loop/20261027-132405`: nueva ejecución real sobre la segunda sesión ya subida, con cachés identificados. Mismo modelo y mismos originales; B-roll pertinente aceptado. Se conservaron versiones anteriores.
4. Sesión manual separada `4fb63223-66c1-4ab7-b7b4-df5b6eab9acf`: cuestionario → seleccionar raw → subir → ASR nuevo → crear edición → previsualizar → exportar → descargar. Se archivó en `work/fran-loop/opus-loop-final/ui-session`. El SHA-256 descargado coincide con el export.

Son cinco ejecuciones editoriales sobre dos proyectos crudos, en cuatro sesiones de subida (la tercera vuelta reutiliza una sesión). No se usó el video editado de referencia como benchmark de crudo.

## Validaciones

- Tiempo ahorrado: siete tomas en orden, 277 palabras, 96,8 s, 1080×1920. Archivo final: `public/work/fran-loop/opus-loop-final/tiempo-ahorrado.mp4`.
- Estrés: una toma, 157 palabras, 49,3 s, 720×1280 a partir de 480×848. Archivo generado/descargado por la interfaz: `public/work/fran-loop/opus-loop-final/estres-ui.mp4`.
- Comparación de señal a lo largo de todas las tomas: 98 ventanas activas en Tiempo, correlación mínima 0,9348; 50 en Estrés, mínima 0,984. Desfase observado máximo 0,312 ms. No equivale a escucha semántica ni certifica la transcripción.
- Los dos MP4 llegaron a `ended: true` en el navegador, con duración 96,811 y 49,301 s y sin errores de consola. Esta prueba de decodificación se ejecutó silenciada; no se presenta como escucha completa.
- TypeScript del renderer y de Next, cobertura de captions, reglas de frases, contratos de recursos, procedencia/orden, clasificación de crudo/referencia, geometría del rostro, cola y ausencia de fallback, selección de stock, preparación de sonidos y entrega real de imágenes/rangos pasaron sus comprobaciones específicas.

## Revisión visual y lo que falta

La revisión nueva de Sol reconoce rostro despejado, encuadre consistente, buena legibilidad y recursos pertinentes. Conserva observaciones menores sobre asociación de unidades, peso del B-roll y competencia entre una lista y el caption. Su estado es candidato para revisión humana, no aprobación estética.

Su primer pase marcó como fallo una imagen sin texto durante una pausa. Se contrastó: el frame 269 (8,967 s) cae después de «minutos» (8,411 s) y antes de «El» (9,031 s). La ausencia de caption cumple el contrato de limpiar páginas en pausas >450 ms. Se guardó ese informe y se añadió estado temporal explícito al contrato del revisor; el siguiente pase dejó de marcarlo como error.

Aún hacen falta feedback del creador, escucha humana de música/voz y comprobación en el dispositivo/plataforma elegidos. La selección de stock sigue siendo un catálogo limitado; no es material propio de Fran ni debe presentarse como evidencia de hechos. La igualdad del modelo durante las mejoras no prueba que nunca convenga otro: justifica corregir primero el sistema y medir antes de aumentar capacidad.

## Cómo mejorar la grabación

Subir el archivo original de cámara, preferiblemente 1080p o superior; cámara a la altura de los ojos, menos techo y espacio en el torso para texto; luz de frente y voz cercana sin eco fuerte. Preparar el encuadre antes de hablar. Mantener continuidad de ropa/posición entre tomas cuando el cambio no sea narrativo. Aportar clips propios relacionados con el guion suele dar mejor apoyo que exigir stock genérico.

## Para probar

Aplicación: `http://localhost:3001/app`.
Comparación de resultados: `http://localhost:3001/work/fran-loop/opus-loop-final/index.html`.
El usuario elige familia, tipografía y política antes de subir. Ninguna preferencia estética de estos borradores se guarda como aprobada sin su feedback.


## Continuación del loop · tarde del 27 de octubre

Tres ejecuciones más sobre los mismos dos proyectos crudos: dos sesiones nuevas y una repetición de la sesión de siete tomas. Sigue Sol por ChatGPT, con ASR reutilizado solo para hashes e idioma/vocabulario idénticos. Dirección, recursos, encuadre y render se vuelven a ejecutar.

Cambios: unidades bajo cada cifra; B-roll más grande dentro de la zona medida; listas menores con foco en la frase completa activa. Pasaron TypeScript, cobertura y agrupación de captions y pruebas del foco con palabras repetidas, pausas y límites del evento.

Fallo real: Sol aceptó una tormenta de nieve para ilustrar caminar en un argumento de prisa cotidiana. El host rechazó ese borrador. La política v5 descarta eventos extremos ausentes de la voz y evalúa alternativas. La repetición eligió una calle peatonal. Cinco pruebas de recursos pasaron, incluida la continuidad al segundo candidato tras rechazar una tormenta.

Se detectaron capturas heredadas en el archivo inicial de una sesión reutilizada. Opus 5.5 revisó esas capturas del primer borrador, identificó la tormenta y el contraste bajo. Se conserva como crítica del borrador rechazado, **no como validación del MP4 final**. Modelo observado: claude-opus-5-5; sin fallback ni denegaciones. El runner separará previous-review antes de renderizar en siguientes ejecuciones; esta protección compiló, pero aún falta ejercitar una nueva reutilización completa tras ese cambio.

El revisor confundió el nombre interno card con un panel obligatorio. Se aclaró el contrato V3: un texto, fuente de título y énfasis tipográfico. Los informes previos se conservan; el revisor puede seguir criticando un énfasis débil. La revisión final de Sol extrajo imágenes de los MP4 nuevos y dejó ambos como candidatos a revisión humana, con observaciones menores.

Pasaron integridad de originales, orden, tiempos y cobertura de 277 y 157 palabras. La señal de voz pasó en 98 y 50 ventanas activas de un segundo, respectivamente. No certifica escucha semántica. La comprobación completa de señal quedó integrada y fue ejecutada por el runner en la repetición final.

Pendientes: margen/contraste de listas, equilibrio de insertos, más identidad de composición, gestos cerca de bordes y limitaciones de resolución del raw de piscina. No se encadenan cambios de tamaño contradictorios solo por opiniones de modelos: falta preferencia humana.

Galería: http://localhost:3001/work/fran-loop/20261027-181816-final/index.html . Evidencia privada: work/fran-loop/20261027-181816 y work/fran-loop/20261027-182306. Todo local; sin despliegues ni cambio de facturación.

Reproducción real comprobada con Playwright: ambos MP4 llegaron a ended=true (96,811 y 49,301 s), sin error de medios, errores de consola ni desbordamiento horizontal en el viewport de prueba. Reproducción silenciada; no sustituye escucha humana.
