# Personalización fiable y propuestas que respetan el borrador

16 de octubre de 2026. Primer incremento de la investigación de autonomía. Implementación local completada y verificada; sin commit, push ni despliegue.

## Qué cambió

- Las preferencias ausentes, inválidas y temporalmente ilegibles son estados distintos. Un perfil roto ya no se reemplaza silenciosamente por valores predeterminados. La recuperación requiere una acción explícita del usuario.
- Cada nuevo trabajo recibe una copia validada de sus preferencias. Los videos existentes conservan su estilo aunque cambie el perfil de la cuenta. El guardado local del perfil usa reemplazo atómico.
- La propuesta usa el borrador visible, incluidas las modificaciones aún no guardadas. Conserva los elementos existentes, fotos, gráficos, zooms y decisiones explícitas sobre énfasis. Sólo admite nuevas sugerencias compatibles.
- Se rechazan sugerencias con rangos o tipos inválidos, IDs repetidos, solapes, exceso de densidad o contadores cuya cifra no aparece como token numérico completo. No se permiten fotos inventadas por el modelo.
- Si el usuario edita mientras llega una propuesta, se descarta la respuesta tardía. Los fallos de red vuelven a habilitar el botón. Deshacer, rehacer y editar retiran el resumen anterior para evitar información desactualizada.
- El editor informa cuántos elementos se añadieron, se conservaron y se descartaron. Una propuesta vacía se distingue de candidatos totalmente rechazados.

## Verificación ejecutada

| Comprobación | Resultado y alcance |
|---|---|
| `npm run typecheck` | Pasa |
| `node scripts/test_brand_catalog.mjs` | Pasa; aserciones previas conservadas |
| `node scripts/test_personalization_contract.mjs` | Pasa: validación, archivos, perfil, auth/proxy, rutas, propuestas y arranque |
| `.venv/bin/python scripts/test_brand_catalog.py` | 6 pruebas pasan |
| `.venv/bin/python scripts/test_personalization_contract.py` | 6 pruebas pasan; no se inicia el motor con preferencias inválidas |
| Fixtures compartidos TS/Python | 22 entradas, incluidos null, versiones, claves reservadas y límites UTF-16 |
| Playwright | 8 escenarios pasan, sin errores de página |
| Inspección visual | Capturas de escritorio y móvil revisadas; se encontró y corrigió un resumen obsoleto después de deshacer |
| Graphify | Actualización completada después del último cambio de código |

Comando de navegador en este equipo:

```sh
CUTKIND_PLAYWRIGHT_RUNTIME=/Users/santiagorosado/.cache/codex-runtimes/codex-primary-runtime/dependencies/node node scripts/test_personalization_browser.mjs
```

El navegador ejecutó componentes reales Editor, ProfileRecovery y StyleQuiz con respuestas de red, navegación Next y preview simulados. Comprueba envío del borrador, descarte de respuesta tardía, conservación de elementos, deshacer, fallo de red, aviso de perfil, recuperación explícita y guardado del cuestionario. No constituye una prueba de Next SSR, Supabase desplegado ni de la API editorial real.

Evidencia local (en `work/`, ignorada por Git):

- [Editor escritorio](../../../work/personalization-20261016/editor-desktop.png)
- [Editor móvil](../../../work/personalization-20261016/editor-mobile.png)
- [Recuperación móvil](../../../work/personalization-20261016/profile-recovery-mobile.png)
- [Resultado Playwright](../../../work/personalization-20261016/results.json)

## Revisión con Claude

Codex escribió el código y ejecutó las pruebas. Claudex utilizó Claude Opus 5.5, esfuerzo high, para revisar el plan y realizar dos inspecciones independientes. La primera detectó cuatro problemas que fueron corregidos; la segunda dio **APPROVED**, sin hallazgos altos ni medios y con tres observaciones menores pendientes. Claude no ejecutó las pruebas.

Plan aprobado SHA256: `0fa0fc161b3ac9f9dc413a405c5bd210201f6dbf498fcb7aa5c3c77718e12cfd`.

Snapshot inspeccionado SHA256: `ef099e9f62111b540e3daf684b22c419d411a4e93ee42ac438952aeea7597687`.

Los 30 archivos de código, pruebas y fixtures del incremento coinciden con la inspección. Después sólo se escribió documentación de cierre; la aprobación corresponde al snapshot anterior a estos registros. [Huellas por archivo](INSPECCION-APROBADA.json) y [registro completo](LOG.md).

## Pendientes conocidos

| Prioridad | Pendiente | Efecto actual |
|---|---|---|
| Baja, L1 | Clasificar fallos de auth también en billingUser y requireAccount | Billing puede responder 401 ante una caída de auth; requireAccount puede redirigir al login en una carrera entre comprobaciones |
| Baja, L2 | Mensaje de respaldo si /api/profile devuelve HTML u otro cuerpo no JSON | El aviso puede mostrar un error técnico de parseo |
| Baja, L3 | Sanitizar errores de lectura de preferencias en Python | Un error de permisos/codificación puede mostrar la ruta local en el estado del trabajo; la ejecución sí se detiene |
| Decisión conservadora, R3-1 | Evaluar densidad por zona candidata | Si cualquier ventana existente ya supera el límite, se bloquean todas las nuevas adiciones; los elementos anteriores se conservan |

## Qué falta para autonomía editorial

Este incremento hace más fiable la personalización existente. Todavía no aprende tu gusto a partir de aprobaciones/rechazos ni interpreta automáticamente videos de referencia. Tampoco incorpora el esquema v2 completo, procedencia persistente de decisiones, un bucle autónomo de evaluación y corrección audiovisual, ni una regla de entrega basada en calidad comprobada.

El siguiente trabajo útil es registrar qué propuso la IA y qué aceptaste, rechazaste o cambiaste, con versiones y razones. Esa evidencia permitirá aprender preferencias sin confundir una decisión puntual con una regla permanente. Tus grabaciones y ejemplos comentados servirán después para evaluar ritmo, selección, composición y fidelidad al estilo.

No se produjo un MP4 nuevo en este incremento y el renderer no cambió. Las capturas validan la interfaz; no demuestran calidad audiovisual. Tampoco se probaron cuentas reales, RLS desplegado ni respuestas reales de Anthropic. No hay evidencia suficiente para asignar un porcentaje honesto hacia un sistema 100 % autónomo.

Fuentes consultadas para la clasificación de datos y errores: [Supabase maybeSingle](https://supabase.com/docs/reference/javascript/maybesingle), [códigos de error Auth](https://supabase.com/docs/guides/auth/debugging/error-codes) y [tipos de error oficiales](https://github.com/supabase/auth-js/blob/master/src/lib/errors.ts).
