# Primer incremento — versiones y exportación

20 de octubre de 2026. Implementado localmente. **No se ha aprobado calidad editorial ni completado A0/A1/A6.**

**Actualización posterior:** el usuario pidió borrar los trabajos y priorizar una primera edición completa con preguntas previas. Ver ONE-SHOT.md. Se borraron también los MP4 de prueba mencionados aquí; quedan registros/capturas, pero no deben presentarse como archivos todavía disponibles. La entrada actual es `/app`: al confirmar las preguntas se habilita la subida a una sesión temporal, sin biblioteca de proyectos. La edición automática completa sigue pendiente.

## Comportamiento disponible

- Cada nueva propuesta conserva plan, borrador de partida, timeline, estilo e informe en `work/<job>/candidates/<uuid>.json`. Crear una propuesta no escribe sobre el activo. El historial permite ver ambas versiones y regresar al borrador; comparar no lo reemplaza. Guardar/renderizar se deshabilita mientras se consulta el historial para evitar exportar otra versión por confusión.
- Manifiesto inicial: hashes de original conformado, plan, timeline, estilo, fotos y una lista de archivos del código/catálogo; proveedor y digest del modelo local si está disponible. `quality_approved` sigue siendo `false`. Datos faltantes aparecen como `null`.
- Guardar calcula captions/posiciones en un directorio temporal. Sólo al terminar reemplaza atómicamente la pareja plan/timeline en `active-edit.json`, conservando una copia en `versions/`. Una petición con revisión anterior o un guardado concurrente devuelve 409. Si falla Python, el activo no cambia.
- La API local de promoción valida la base, el montaje, el original y las fotos antes de aplicar una candidata. Conserva su montaje, sin recolocarlo silenciosamente. Esta API aún no tiene botón de aprobación en el historial; la aprobación editorial y el feedback estructurado son trabajo posterior.
- Render usa un UUID y copias de entrada en `renders/<uuid>/input/`. Python recibe `--execution-id` y no retranscribe, corta ni recoloca ese snapshot. El MP4 y QC quedan en esa ejecución; `current-render.json` identifica el intento actual.
- El editor conserva cambios hechos mientras llega un guardado. Deshacer/rehacer conserva la revisión vigente, para permitir guardar el contenido restaurado.
- Wikimedia CC0 y Pixabay se admiten también en Python. Doce casos compartidos comprueban licencia e identificadores de los cuatro proveedores.

## Compatibilidad de archivos

`readActiveEdit()` lee el nuevo `active-edit.json` si existe; si no, usa `plan.json` y `timeline.json` legacy. El primer guardado mantiene esos archivos anteriores como baseline: no son la versión actual después de migrar.

La web y sus renders leen el nuevo activo. Una invocación legacy de `pink_edit.py` sobre un trabajo que ya tiene `active-edit.json` falla explícitamente y pide exportar desde la web. Evita que un CLI antiguo renderice el baseline por error. No equivale a una migración del worker cloud; ésta sigue pendiente.

Los outputs anteriores se conservan. Si el intento actual falla, su descarga no sustituye silenciosamente el archivo por un render anterior.

## Verificación realizada

- TypeScript: `npm run typecheck`.
- Disco temporal y rutas reales: `node scripts/test_candidate_versions.mjs`. Cubre persistencia sin modificar activo, baseline con cambios no guardados, fallo de layout, promoción, base obsoleta, escrituras concurrentes, integridad, snapshot de render y error de arranque. Python/inferencia simulados en esta prueba.
- Contrato de fotos: `node scripts/test_photo_contract.mjs`, mismos doce datos en validadores TS/Python.
- Python: `scripts/test_isolated_render.py` verifica paths y que la exportación congelada no invoque preparación. Renderer simulado sólo en esta prueba.
- Regresiones de personalización, contexto y bancos de imágenes. Transporte externo simulado; sin nuevas llamadas pagadas.
- Playwright: componentes reales, APIs y Preview simulados; historial, vuelta al borrador, edición durante respuestas y errores. No se presenta como prueba de pertinencia ni del renderer.
- **Render real:** `scripts/test_render_snapshot_e2e.py` crea tres segundos sintéticos con geometría, tono de audio y captions de fixture. Ejecuta Remotion y FFmpeg, verifica hashes de entrada y QC. Resultado PASS en `work/ollama-pilot/versioning-smoke/8fa3ff45-5c3d-4c7d-8179-1bb93fce8f77/`. Frame revisado visualmente. El script elimina sólo los directorios temporales del job que creó y conserva evidencia aparte.
- Endpoint real local del historial de `img-2405`: 200 con lista vacía, esperado porque no se han generado nuevas propuestas con esta versión.
- Playwright sobre Next real en `http://localhost:3001/edit/img-2405`: carga 200, historial visible y cero errores de página observados. Captura `local-history.png` y resultado `local-ui.json` en la misma carpeta de evidencia del render. Comprobación de lectura, sin proponer/guardar/renderizar ese video. Graphify actualizado después de los cambios de código.

## Lo que todavía falta

1. A1: `EditorialIntent`, compilador y contrato de eventos v2. `plan.version` sigue siendo una revisión de guardado, no una versión de esquema.
2. A2/A4: director que escoja recetas por significado y seis primeras recetas operativas. Este incremento no mejora por sí solo la selección visual.
3. A3/A5: biblioteca propia, B-roll, composición por evento completo y mezcla de audio.
4. A6: proxy/QC visual completo, aprobación explícita, restauración desde historial, corrección de transcripción y pantalla de decisiones.
5. A0: manifiesto con esquema formal, parámetros/prompt completos, herramientas/modelos empaquetados, memoria/tiempos por etapa, runner de reproducción, conformado/VFR/HDR y paquete de evaluación. Los hashes actuales detectan cambios; todavía no hacen una ejecución completamente reproducible.
6. B1: cola durable, slot global de cómputo, lease y recuperación automática de locks tras muerte del servidor. El lock actual sólo excluye escrituras/arranques del mismo job; sigue pendiente cerrar la carrera entre trabajos distintos. No se ha activado upload→edición automática.
7. B/C: marcas, aprendizaje, resto de recetas y producción remota.

Los medios y el código no están archivados íntegramente por ejecución. Cambiar un archivo de una foto, fuente, audio, matte o el runtime puede afectar una reproducción futura; el registro de assets inmutables pertenece a A3. La muestra sintética no verifica rostro móvil, voz real ni criterio editorial. La nueva grabación del usuario sigue siendo necesaria para evaluar una primera propuesta útil.

Próximo bloque de implementación: contrato de intención y compilador con recetas habilitadas explícitamente, antes de conectar el nuevo director. No marcar recetas como automáticas por haber implementado sólo el historial.
