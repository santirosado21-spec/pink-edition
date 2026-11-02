# Trabajo que puede avanzar sin nuevas grabaciones

Propuesta del host tras investigación y tres rondas de revisión de Opus 5.5; PLAN.md aprobado como propuesta de trabajo futuro. No es lista de funciones implementadas. Las grabaciones del usuario calibrarán gusto; los fixtures pueden probar contratos y fallos desde ahora.

| Orden | Entregable acotado | Código implicado | Prueba de salida |
|---|---|---|---|
| 1 | Perfil ausente, inválido y de versión desconocida se distinguen; nunca sustituir reglas explícitas por defaults tras un error | preferences.ts, profile.ts, plan_io.py, worker.py | Perfil con graphics=none y un campo v2 ante lector antiguo produce rechazo claro, cero llamadas IA y cero entrega dinámica. Lectores v1 siguen funcionando. |
| 2 | Compilador de restricciones + procedencia por evento + propuesta segura | proposalPlan.ts, propose.ts, jobs.ts, edit.ts, plan_io.py | Modelo sobrepropone: salida respeta ventanas/solapes. Re-proponer conserva foto/corrección manual. Photo no se ofrece al modelo y contador inválido genera diagnóstico por elemento. |
| 3 | Manifest de revisión del MP4 y gate explícito de incertidumbre | review_frames.py, transcribe.py, finish_full_demo.py, pipeline | Muestras por eventos y zoom; source/output time; no rostro detectado queda unknown. Voz sin texto señalada en es/en/mixed; OCR equivocado no reescribe discurso. |
| 4 | Historial de correcciones con alcance | Editor.tsx, persistencia de planes/perfiles | Sólo este video no cambia perfil; recordar actualiza regla concreta versionada y permite deshacer. Snapshots anteriores no cambian. |
| 5 | Orquestador local con proveedores simulados y después reales | pink_edit.py, worker.py, adaptador IA | Caída/reinicio recupera sin duplicados, presupuesto agotado detiene, caché cambia con sus dependencias; un resultado vacío legítimo se distingue de rechazo total. |

Orden deliberado: primero corregir las condiciones que podrían traicionar las preferencias actuales. Después ampliar la memoria editorial y conectar autonomía. No hace falta reemplazar Remotion ni esperar un corpus para demostrar estos fallos.

## Pruebas nuevas propuestas, todavía no existentes

- `node --test scripts/test_personalization_contract.mjs`: fixtures compartidos/golden de resolución, conflictos, provenance/locks, límites, propuesta parcial e instrucciones dentro de transcript.
- `.venv/bin/python scripts/test_personalization_contract.py`: consumidores Python rechazan versiones desconocidas, leen mismo JSON resuelto y conservan snapshots.
- `.venv/bin/python scripts/test_delivery_review.py`: intervalos fuente/salida, QC desconocido, múltiples motivos por frame, preservación de aspect ratio y límites de reparación.
- `node scripts/test_personalization_browser.mjs`: Playwright sobre demo/fixture, perfiles de navegador aislados, A/B mismo clip, persistencia y revocación de regla; no cuentas reales.

Antes de construir cada paquete se fija su contrato y fixtures exactos. Estas rutas son nombres propuestos para las nuevas pruebas; no se presentan como comandos que ya pasan. Las pruebas actuales que sí se ejecutaron están en VALIDACION.md.

## Trabajo que sí necesita tus ejemplos

El ritmo que te gusta, qué silencios conservar, el grado de énfasis, selección de recursos y transferencia de referencia necesitan preferencias etiquetadas. Podemos preparar el formulario y la extracción de métricas; no inventar tus decisiones. Cada ejemplo deberá separar original, resultado deseado, intervalos importantes, razones y cosas a evitar. Reservar parte del material para evaluación, sin ajustar sobre todo el conjunto.

## Primera decisión recomendada

Empezar por los paquetes 1 y 2 como una fase de **fidelidad a la personalización**. Su criterio de éxito es que el sistema jamás pierda una prohibición del creador por un perfil inválido, una nueva propuesta o un fallo de migración. Es una mejora verificable incluso antes de evaluar gusto.

## Precisiones aceptadas de la revisión final

- **L1, procedencia en nube:** al implementar persistencia, impedir que una inserción directa mediante Data API falsifique `origin`, `locked` o `decision_id`. Elegir entre escritura controlada por servidor/RPC o verificación del worker contra un registro escrito por servidor; discrepancias se clasifican como `unknown`. Fixture requerido: plan insertado por REST con `origin=user` falsificado no gana protección de usuario sin evidencia. No se han cambiado permisos desplegados.
- **L2, compatibilidad de toggles:** toda semántica nueva de `sfx=none` o `graphics=none` pertenece a `pipeline_version=2`. Verificar primero comportamiento histórico v1 y conservarlo al reexportar. Fixture requerido: v1 con `sfx=none` y transición entre tomas mantiene su render esperado.

Son aclaraciones de baja severidad aceptadas para la implementación. Se mantienen fuera del archivo PLAN.md para preservar el hash aprobado por Claudex.
