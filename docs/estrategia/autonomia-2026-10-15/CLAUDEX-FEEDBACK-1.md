# Disposiciones del host — ronda 1

Se aceptan los 14 hallazgos como mejoras al plan. No se han implementado fixes de producto. El PLAN se reescribió en A/C y se añadieron requisitos R1–R5 para evitar garantías que el código todavía no cumple.

| Hallazgo | Disposición |
|---|---|
| F1 | R1: invalid/unknown profile bloquea, lectores primero; no fallback silencioso. |
| F2 | R2: densidad y solapes pasan de opción supuesta a trabajo determinista explícito, ventana y clases definidas. |
| F3 | R3: enum sin photo, validación individual y resultado degradado distinguible de estilo limpio. |
| F4 | R2: procedencia/locks; eventos antiguos protegidos; re-propose conserva correcciones y fotos del usuario. |
| F5 | R2: mapa de toggles, excepciones confirmadas por video y tratamiento de aplicar perfil nuevo. |
| F6 | R4: VAD fuente/exportado en todos idiomas, mapeo temporal, huecos cortos y incertidumbre separados de pérdida. |
| F7 | R5: piloto local y migración aditiva específica antes de nube, preservando enums externos actuales. |
| F8 | R5: reserva atómica de presupuesto cuenta/trabajo en servidor/worker, prueba REST directa y concurrencia. |
| F9 | R5: dependencias y claves por artefacto/caché, perfil nuevo genera snapshot. |
| F10 | R1: reglas/historial/evidencia separados de preferences <4096 bytes. |
| F11 | R4: heurística actual no es rostro; frames sin clamp, no detección=unknown, umbral provisional de fixtures. |
| F12 | C/R4: stills no son MP4, tipos por frame como lista, zoom/cuts/fronteras, aspect ratio conservado. |
| F13 | R1: compilador único y archivos de fixtures/goldens compartidos. |
| F14 | R3: sólo UI estructurada confirmada eleva autoridad; transcript/notas/referencia son datos; fixture de inyección. |

Segunda ronda: revisar sólo el PLAN revisado y estas disposiciones contra los hallazgos ya obtenidos. No hacer nuevas búsquedas globales ni explorar más archivos. La primera ronda rebasó la lista de lectura y no aplicó Graphify en la exploración adicional; registrar esa desviación no la convierte en autorizada. El host ya confirmó por lectura acotada el fallback, la ausencia de densidad determinista y el umbral VAD; claims de migraciones quedan estáticos, no prueba del servicio real. No leer medios, work/ ni secretos. No reauditar todo el repo ni repetir la inspección anterior. Evaluar si este plan de investigación y paquetes futuros es coherente, dejando el detalle de implementación en sus planes específicos.
