# Matriz de verificación

Estos casos se verificaron con fixtures sintéticos, sin cuentas reales ni consumo de APIs editoriales.

| Entrada / acción | Resultado requerido |
|---|---|
| Sin archivo o sin fila | Perfil ausente compatible |
| Archivo presente con null, false, {}, [], JSON roto | Error, nunca defaults |
| Perfil v2 desconocido, catálogo inválido, clave extra | Rechazo TS/Python |
| Archivo sin permiso o consulta con error | Error de lectura distinto de ausencia |
| Worker con perfil inválido | run_engine no se ejecuta |
| CLI con snapshot inválido o archivo solicitado ausente | No se ejecutan conform ni transcripción |
| Borrador distinto del guardado | La propuesta usa el borrador |
| Perfil inválido dentro del borrador | Respuesta 400, cero llamadas IA |
| Foto/gráfico/zoom existente y petición IA | Originales intactos, IDs no colisionan |
| Edición durante llamada lenta | Respuesta tardía descartada, edición intacta |
| Énfasis explícito [] | Permanece vacío tras propuesta |
| Foto propuesta por modelo | Descartada con motivo |
| Contador sin cifra literal | Descartado; otros elementos válidos continúan |
| Solape nuevo con elemento protegido | Rechazado sin eliminar el original |
| Modelo devuelve cero candidatos | Resultado vacío legítimo distinguible de rechazo total |
| Error de red | Botón recuperado y borrador intacto |

Estado de cierre: contratos y ocho escenarios Playwright pasan. Claude Opus 5.5 aprobó la segunda inspección, con tres observaciones menores pendientes. Alcance, comandos, evidencia y limitaciones en RESULTADO.md; respuesta completa y disposiciones en LOG.md.
