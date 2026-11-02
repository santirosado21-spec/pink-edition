# Integración local — 20 octubre 2026

Implementado: selector previo a subida de cinco familias, muestras animadas mediante el mismo componente Remotion del exportador, parejas locales y selección persistida en el brief. Compatibilidad de perfiles anteriores: no se impone familia/fuente a un perfil guardado.

Registro compartido entre Python y TypeScript: `style/editorial-recipes-v1.json`. El director sigue escogiendo frases y stock; la familia determina la presentación entre variantes compatibles. Alternancia determinista por tipo, sin usar variedad como criterio de pertinencia. Cada evento nuevo registra variante, receta, motivo e índices de captions. Los índices anclan el intervalo de discurso; no constituyen una evaluación semántica independiente.

Render conectado: seis tratamientos de texto (líneas, máscara, palabra acentuada, cita, subrayado, rótulo), comparación de conceptos sin barras estadísticas inferidas, mapa de ideas, B-roll enmarcado y dividido con texto literal, papel y grano. Títulos flotantes para Umbral/Pulso, papel para Estampa, rótulo inferior para Bitácora, borde y conexiones para Enlace. Se mantiene el espacio reservado al rostro y captions.

Tres transiciones de imagen en uniones de tomas: máscara, enfoque y escala breve con desenfoque. No solapan ni acortan audio. El manifiesto de transiciones reales sustituye el conteo de beats; una toma sola no satisface todavía el requisito de transición mediante eventos de B-roll. Es una limitación explícita.

## Pendiente del mapa original de 24 recursos

Todavía no integrados: cifra contextual, cronología, causa/efecto y antes/después con evidencia estructurada; B-roll completo autorizado, detalle con callout localizado y mosaico con varios recursos únicos; corte por acción con análisis de movimiento; gestos sonoros y ambiente con procedencia. No se presentan como variantes disponibles. El pipeline musical existente sigue activo.

También pendientes: historial de aprobaciones por marca y evaluación semántica más amplia. No se incorporaron fuentes candidatas de Fontshare sin muestras/licencias verificadas. REA no fue necesario: el problema de variedad está directamente localizado en el render y el contrato de planificación.

## Verificación

TypeScript, contratos de brief/catálogo, cuatro casos de recetas (selección, anclaje, familia inválida, transición real), seis pruebas de cobertura de tomas y seis de corte de voz. Exportación local sintética de tres clips: imagen de la segunda toma en Player, imagen de cada toma en MP4, correlación de audio por toma y descarga. Diez fotogramas y tres MP4 sintéticos de seis segundos para comparar Umbral/Estampa/Pulso; no son trabajos del usuario ni aprobación estética.

La sesión original de siete clips expiró. Estas pruebas no demuestran corregido su caso concreto; requiere cargar de nuevo los originales para validarlo.
