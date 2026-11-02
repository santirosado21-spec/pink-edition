# Disposiciones de ronda 2 — última revisión acotada

Aceptados N1–N4 en PLAN:

- N1: reanálisis crea borrador de versión nueva, conserva versión previa y eventos protegidos; no sobrescribe el plan activo. Fixture explícito.
- N2: origin=unknown para legado; conflicto requiere conservar como excepción o retirar. Reclasificación como reemplazable es confirmada; needs-review por procedencia pendiente, no propuesta degradada automática.
- N3: nuevas semánticas de densidad sólo pipeline_version=2, con snapshot y aceptación de migración. Reexportar v1 mantiene comportamiento/golden; autopilot exige v2.
- N4: R6 lectores de eventos antes que escritores, metadata asignada por servidor según acción, fuera de salida del modelo y sin confiar en cliente arbitrario.

El encabezado del plan remite al log para estado, para no invalidar el hash añadiendo APPROVED después. Revisar sólo cambios del documento y coherencia con evidencia de rondas anteriores. No nuevas búsquedas de código ni acceso a medios/secrets. Esta es la tercera y última ronda acordada; si quedan defectos materiales, reportarlos en vez de forzar aprobación. Sigue siendo un plan de trabajo futuro, no una implementación revisada.
