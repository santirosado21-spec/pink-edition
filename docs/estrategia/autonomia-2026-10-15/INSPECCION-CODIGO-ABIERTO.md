# Inspección dirigida de código abierto

15 de octubre de 2026. Cuatro archivos públicos obtenidos mediante GitHub API y raw oficiales. No se instaló ni ejecutó su código. Complementa REA pasivo del frontend; no se usó decompilación para fuentes disponibles.

## OpenCut Classic

Commit observado: `cf5e79e919144200294fb9fed22a222592a0aeea`.

[`commands.ts`, líneas 7–91](https://github.com/OpenCut-app/opencut-classic/blob/cf5e79e919144200294fb9fed22a222592a0aeea/apps/web/src/core/managers/commands.ts#L7-L91): `CommandManager` mantiene `history` y `redoStack`. Ejecutar almacena comando y selección previa, y limpia redo. Undo ejecuta el método inverso y restaura selección cuando corresponde.

[`project-manager.ts`, líneas 128–185](https://github.com/OpenCut-app/opencut-classic/blob/cf5e79e919144200294fb9fed22a222592a0aeea/apps/web/src/core/managers/project-manager.ts#L128-L185): al cargar, pausa guardado, asegura migraciones, recupera proyecto y carga escenas, medios y fuentes; después reanuda guardado. [Líneas 189–209](https://github.com/OpenCut-app/opencut-classic/blob/cf5e79e919144200294fb9fed22a222592a0aeea/apps/web/src/core/managers/project-manager.ts#L189-L209): guardar reconstruye snapshot y delega a `storageService.saveProject`.

Conclusión observada: stack undo en memoria y snapshot persistido son piezas distintas en estos archivos. No demuestran aprendizaje ni historial durable entre sesiones. Propuesta nuestra: tercer registro editorial persistente, separado de selección/cursor y del snapshot del plan.

## auto-editor

Commit observado: `44bf4ec3dfffdd1bb5410b06dc9f0365d8f6bbbc`.

[`timeline.nim`, líneas 8–52](https://github.com/WyattBlue/auto-editor/blob/44bf4ec3dfffdd1bb5410b06dc9f0365d8f6bbbc/src/timeline.nim#L8-L52): `Clip2` conserva `start/end/effect`; `Clip` separa posición, duración, offset, stream y efectos; la base temporal es racional.

[Líneas 100–111](https://github.com/WyattBlue/auto-editor/blob/44bf4ec3dfffdd1bb5410b06dc9f0365d8f6bbbc/src/timeline.nim#L100-L111): agrupa tramos consecutivos. [Líneas 161–188](https://github.com/WyattBlue/auto-editor/blob/44bf4ec3dfffdd1bb5410b06dc9f0365d8f6bbbc/src/timeline.nim#L161-L188): conserva rangos originales, crea clips de salida para acciones que no cortan y acumula posición de salida.

[`edit.nim`, líneas 13–73](https://github.com/WyattBlue/auto-editor/blob/44bf4ec3dfffdd1bb5410b06dc9f0365d8f6bbbc/src/edit.nim#L13-L73): representa señales de audio, movimiento, negro, subtítulos y palabras con operadores booleanos.

Propuesta nuestra: distinguir señales de decisiones; conservar rangos de origen y salida con base temporal, también cuando un segmento se elimina. No copiar el centinela de velocidad usado para representar cortes; usar acción explícita `cut`. Los márgenes están documentados en README, pero su implementación no fue parte de estos cuatro archivos.

## Aplicación a Cutkind

Registrar operación reversible y evento editorial por separado. El evento debería contener ID estable, revisión de plan, objetivo, acción, rango fuente/salida, antes/después, actor (`planner`, `user`, `qc_repair`), evidencia, perfil y versión, motivo, ámbito (`this_video`, `profile`) y vínculo a decisión corregida. Este es un contrato propuesto, no código integrado.

Un undo restaura el resultado y puede registrar que una sugerencia fue revertida. No cambia automáticamente el gusto del creador: podría ser un error técnico, un ensayo o una excepción. Las reparaciones de QC tampoco deben convertirse en preferencias estéticas por accidente.

Límites: inspección estática de cuatro archivos, sin pruebas ni auditoría de todos los comandos/adaptadores. Ver delegación al almacenamiento no demuestra durabilidad ante fallos. Ninguna observación justifica reemplazar nuestro renderer o copiar el producto completo.
