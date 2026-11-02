# Registro del plan

20 de octubre de 2026.

- Petición: plan de todo el código pendiente; el usuario grabará un nuevo video de prueba.
- Alcance realizado: contraste de planes previos, código actual y biblioteca; nuevo plan y verificaciones documentales. No se implementaron las funciones propuestas, no se tocaron originales/planes de videos ni se ejecutaron compras/despliegues.
- Roles previstos Claudex: host/planner Codex; reviewer Claude; builder por defecto Codex sólo si se encarga ejecución; inspector posterior Claude. No se inició build/inspect.
- Plan: `docs/implementacion/editor-autonomo-2026-10-20/PLAN.md`. Log: este archivo. Límite previsto: dos rondas de revisión; cero ejecutadas.
- Modelo reviewer: configuración del CLI, sin override; modelo observado: desconocido, no se llamó al modelo. No se presupone que la sesión CLI use el mismo modelo que otras conversaciones.
- Runtime de skill leído en `/Users/santiagorosado/.agents/skills/claudex-loop/references/runtime.md`. Runner resuelto en su instalación, no en el repo. `review --help` verificado.
- CLI encontrado: `/Users/santiagorosado/.nvm/versions/node/v22.22.3/bin/claude`; versión 2.1.148. La ayuda no expone `--safe-mode`, requisito del protocolo. Se reporta incompatibilidad; no se debilitaron restricciones, no se cambió CLI/configuración, no se utilizó otro proveedor ni se afirma aprobación independiente.
- Revisión del autor: separar hito local/producción; no repetir integración Wikimedia ya verificada; cubrir 27 recetas; contratos TS/Python y migración; candidatos y CAS; recursos propios/B-roll; restricciones de voz y marca; evaluación sin datos vistos; presupuesto/recovery; arranque remoto real; distinguir scripts existentes/propuestos y QC/aprobación.
- Riesgos abiertos: criterio editorial del modelo local sin benchmark aprobado; disponibilidad/relevancia de imágenes CC0; costo y viabilidad de worker Linux todavía sin mediciones; esfuerzo real dependerá de fixtures y del video. No hay fecha de producción ni porcentaje de autonomía prometidos.
- Fuentes principales: planes de edición real y Fran→producción del 19 de octubre; `jobs.ts`, `worker.py`, `profile.ts`, `contextualProposal.ts`, `stockProvider.ts`; biblioteca `style/reference-library-v1.json` y evidencia local del piloto sin clave. Se usó Graphify antes de explorar código.

## Inicio autorizado

- El usuario respondió «inicia el plan» después de recibir el plan y la limitación de Claudex. Se inicia implementación local con Codex; no se presupone aprobación de Claude ni se vuelve a solicitar permiso.
- Primer incremento: historial inmutable de propuestas, comparación del borrador original/propuesta, guardado transaccional de plan y timeline, control de versión, exportaciones aisladas y contrato de fotos TS/Python.
- Se encontraron dos problemas previos: guardado del activo antes de terminar layout y Python rechazando los proveedores Wikimedia/Pixabay que TypeScript admitía. Ambos se corrigen y tienen regresiones.
- Ver AVANCE.md para comprobaciones, alcance pendiente y limitaciones. La revisión independiente de Claude continúa sin ejecutarse por la incompatibilidad ya documentada.

## Reorientación one-shot

- Usuario autoriza explícitamente borrar videos locales y exige preguntas antes de cada subida, edición completa en una primera entrega, música, dos tarjetas, dos gráficos, dos B-rolls y transiciones. Chat posterior aplazado.
- Se borran trabajos y copias generadas; no archivar en secreto videos que pidió eliminar. Originales/referencias fuera de los trabajos intactos. Auditoría en `limpieza-local.json`.
- Se implementa cuestionario previo de cuatro pasos y validación de brief. No se reciben nuevas grabaciones mientras falten las capas y la política temporal. Se retira la antigua subida que sólo preparaba/transcribía.
- No afirmar que Qwen falló un encargo que el motor no podía ejecutar. Nuevo orden de implementación y criterio de evaluación en ONE-SHOT.md.

## Corrección: habilitar subida tras cuestionario

- El usuario aclara que confirmar el cuestionario debe habilitar subir el video. Se corrige el bloqueo; no se condiciona la recepción a que todo el motor editorial esté completo.
- Implementado: sesión temporal con snapshot de respuestas, recepción limitada/verificada, exclusión de duplicados, vista previa explícita del original, descarte y vencimiento de una hora. Sin proyectos permanentes ni llamada automática al pipeline viejo.
- La respuesta distingue `uploadAllowed=true` de `ready=false` (edición completa); la UI muestra recibido y pendiente, sin simular procesamiento.
- Pruebas: typecheck; contrato de brief y APIs; recepción real con ffprobe; rechazo de medios inválidos; concurrencia; expiración; descarte; Playwright contra Next real en escritorio/móvil. Los videos sintéticos se eliminan al terminar.

### Subida múltiple sin límite fijo de peso

Eliminado tope de 500 MB en cliente/servidor. Lote secuencial, añadir más, recibos por UUID, progreso por archivo y fallos aislados. Renovación de vencimiento al recibir; lock con actividad protege transferencias largas durante limpieza. Se mantienen validación audiovisual y temporales fuera de biblioteca. Tests API cubren segunda recepción, fallo posterior preservando originales y tamaño declarado superior al antiguo límite.

### Ejecución del lote desde `/app`

Conectada sesión temporal → preparación/orientación → ASR local → director estructurado → recursos → Remotion Player → exportación explícita. Nuevo contrato y límites en `EJECUCION-LOCAL.md`. Se prueba con los siete MOV del usuario, en orden numérico autorizado. Se corrigieron errores encontrados con material real: elecciones sin anclas, búsquedas demasiado restrictivas, falta de contexto para valorar B-roll, CORS del renderizador y grabaciones físicamente giradas. No se modifican originales ni se publican medios privados.
