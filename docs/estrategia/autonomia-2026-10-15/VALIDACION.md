# Evidencia de la investigación

Fecha de usuario: 15 de octubre de 2026 (America/Mexico_City). Los timestamps UTC de las herramientas caen el 16 de octubre.

## Qué se validó

- `npm run typecheck`: exit 0.
- `node scripts/test_brand_catalog.mjs`: PASS de compatibilidad, validación, fuentes, sonidos y catálogo permitido.
- `.venv/bin/python scripts/test_brand_catalog.py`: 6 pruebas, OK.
- Playwright Chromium 151 en navegador desechable: recorrido de ocho pasos de `/demo/estilo` a 1440×1000 y 390×844, guardado y navegación al estudio de demo. Sin errores de página observados ni desbordamiento horizontal del documento en las mediciones.
- En escritorio se eligió Limpio, idioma español y marca sintética. El valor persistido fue `vibe=clean`, `graphics=none`, `language=es`; al reabrir tras hidratación volvió la marca de prueba. No se modificó `work/_profile.json` ni perfil de cuenta.
- La captura móvil mostró opciones de captions parcialmente fuera del primer ancho visible. Se comprobó que es un contenedor horizontal `overflow-x:auto` (727 px de contenido sobre 390 px), y Karaoke queda accesible al desplazarlo. No se reporta como opción perdida. La claridad del gesto de desplazamiento sigue siendo una pregunta de usabilidad.
- Las barras fijas aparecen sobre el contenido al capturar páginas completas; una captura larga no equivale al recorrido de scroll real. No se declara Safari/iPhone validado ni regresión visual contra baseline aprobado.

Evidencia local: `motion/work/research-autonomia-20261015/playwright-results.json`, capturas `desktop-step-*.png`, `mobile-step-*.png`, `quiz-desktop.png`, `mobile-captions-after-focus.png`. El paso 1 de escritorio se guardó como `quiz-desktop.png`; el JSON desktop registra pasos 2–8. Son artefactos locales, fuera de Git.

## REA: observación pasiva reproducible

Se abrió un Chromium aislado con Playwright en endpoint loopback `http://127.0.0.1:9322`. REA no hizo clic ni navegó: la interacción fue Playwright. No se capturaron valores de almacenamiento, cookies, cuerpos de red ni fuentes JavaScript.

| Target | Evidence ID | Alcance |
|---|---|---|
| Descubrimiento local | `ev_aed90069d8fe94bc08eaf2bad0317dd44971f0e844fa7f40e6017d93ff633b5f` | Target `57B609C22173A189005BEA15638CA4D2`, origen exacto localhost:3000. |
| Cuestionario local | `ev_b8c1d6ced80bf41a1a79d4aed029c5d7f43e93a48fdd2d0dc6b4fe6866b27853` | DOM, accesibilidad y recursos; ventana 250 ms. |
| Catálogo público Captions | `ev_1db1b0cf72bddcbbcbc850ea0d9d0d1640032d980a7f8aa93fa5b9ab410e10d7` | Target `0A932CB33BBCE1A19F4108B958A1EE6E`, https://captions.ai/styles; ventana 500 ms. |

Registros completos locales: `rea-local.json`, `rea-captions.json` en el directorio de evidencia. Cobertura `policy_filtered`/`attach_limited`: no actividad previa, orígenes CDN excluidos y sin identidad binaria del artefacto. No demuestra funcionamiento del editor privado de Captions ni su motor IA. La captura pública inicial contiene banner de cookies; no se interpretó como parte del producto editor.

## Visión sobre MP4 entregados anteriormente

Se extrajeron 11 cuadros, sin modificar originales:

- Piscina v9 sin música: 3, 10, 20, 35, 45 segundos.
- `img-2334-revision`: 2, 15, 30, 42, 43, 44 segundos.

Fuente: MP4 final existente, no viewport del editor ni render nuevo. FFmpeg escaló las muestras a 540×960 para este diagnóstico. Apple Vision local (macOS 26.6.2, build 25G83) ejecutó reconocimiento de texto y detección de rectángulos de cara; revisiones de petición guardadas en JSON. Sin descarga de modelos ni envío de medios a un API externo de visión.

Resultados:

- 11/11 cuadros con una cara detectada. Es cobertura de detección sobre esta muestra, no precisión medida con ground truth.
- 10/11 cuadros con texto reconocido; el de piscina a 10 s no muestra captions en la muestra visual revisada.
- Un posible solape texto/cara en `revision-2s.png`: 51.2 % del área del cuadro OCR intersecta el rectángulo de cara. OCR tiene confianza 0.3. La revisión visual confirma que «desde» cae sobre la zona de barbilla. No tapa los ojos; sigue siendo un caso útil para definir margen del rostro y captions adaptativos.
- A 35 s de piscina, OCR leyó «el niesgo de» donde la inspección visual muestra «el riesgo de». Es un error del detector: NO se debe modificar el transcript automáticamente para ajustarlo a OCR.
- A 42–43 s de la revisión se ve el mismo caption. Los cuadros no permiten decidir si hay voz adicional omitida ni juzgar su sincronía. La revisión auditiva pendiente sigue pendiente.

Artefactos: `vision-results.json`, `vision-summary.json`, `vision-qa.swift` y PNG en `motion/work/research-autonomia-20261015/`. La revisión visual del host incluyó cinco cuadros de video (piscina 10/35 s y revisión 2/42/43 s), además de capturas de UI/Figma. Los otros seis se analizaron automáticamente, no se declaran inspeccionados visualmente uno por uno.

Conclusión: visión sirve para producir alertas con evidencia; ya encontró un candidato de colocación y mostró un falso reconocimiento. Todavía no hay clasificador calibrado, cobertura continua, política de reparación ni aprobación estética automática. No se hizo una edición nueva de video en esta investigación.

## Figma

[Archivo conceptual](https://www.figma.com/design/nYnrQP08VM01puO6HI8lSx?node-id=3-129).

- Mi estilo: `3:130`.
- Comparar A/B: `3:175`.
- Corregir y recordar: `3:232`.

111 capas descendientes editables; 73 textos, 28 frames, 6 instancias y 4 formas. Tres pantallas de 896×1240, con etiqueta Concepto. Se corrigieron superposiciones detectadas en primera captura y se revisó la captura final. Se cambió «música» por «sonido» en `3:182` para respetar el alcance actual. No hay prototipo interactivo ni funcionalidad producto conectada.

Captura: `motion/work/research-autonomia-20261015/figma-personalization-concept.png`.

## Bloqueos y límites

- Mobbin: un intento, rechazado por requisito de plan de pago. No se obtuvieron pantallas.
- Claude CLI global 2.1.148 no ofrece `--safe-mode` requerido por Claudex. Se instaló paquete oficial 2.1.301 en carpeta temporal sin tocar instalación global ni dependencias del producto; se llamó al binario nativo que sí ofrece esa bandera. Resultado de revisión y modelo observado: ver `CLAUDEX-LOG.md`.
- Sin pruebas autenticadas de nube, API editorial real, nuevas grabaciones ni evaluación de gusto por usuarios.
- Pruebas actuales no sustituyen casos nuevos del PLAN. No se atribuyen a esta investigación las pruebas históricas de documentación anterior.


## Cierre de revisión independiente

Claudex completó tres rondas con modelo observado `claude-opus-5-5`. Veredicto final: **APPROVED** para el plan de trabajo futuro. Se incorporaron al plan 14 hallazgos iniciales y 4 de segunda ronda. Dos aclaraciones menores finales quedaron aceptadas en SIGUIENTE-TRABAJO.md. El runner confirmó que la aprobación coincide con el SHA256 actual del plan; respuesta completa, límites y desviaciones en CLAUDEX-LOG.md. No equivale a aprobación de implementación ni de calidad audiovisual.
