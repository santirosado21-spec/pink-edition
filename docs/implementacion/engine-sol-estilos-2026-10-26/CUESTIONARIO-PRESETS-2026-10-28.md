# Cuestionario rápido con decisiones ejecutables

El usuario pidió valores predeterminados que reduzcan escritura y tokens, y que cambien realmente la edición. Implementación local del 28 de octubre de 2026.

## Flujo

`/app?new=1`: dos pantallas, selección y confirmación. Explicativo viene seleccionado; no hace falta escribir. Idioma español, objetivo general y público general vienen visibles al expandir contexto; objetivo y audiencia se repiten en la confirmación. Se conserva personalización de letras, gráficos, clips/láminas, énfasis y sonido. Las muestras son imágenes estáticas opcionales, con identidad Cutkind. No se habilitan fotografías independientes ni cambios del fondo de la persona.

| Preset | Cambios reales |
| --- | --- |
| Limpio | Umbral, Cine íntimo, frases blancas, sin gráficos, B-roll, intertítulos ni SFX; música tranquila. |
| Explicativo | Enlace, Documental moderno, palabra clave, comparación/lista, énfasis sobre la toma, hasta 2 clips pertinentes, SFX suaves, música documental. |
| Impacto | Pulso, Anton, karaoke, palabras a pantalla completa, comparación/lista, hasta 4 clips pertinentes, SFX presentes digitales, música energética. |

Siempre se preserva voz y orden. La frecuencia se expresa como intervalo mínimo entre inicios de apoyos: 12/8/6 segundos; no acelera la voz. En modo natural los límites son máximos por edición completa, nunca cuotas. El motor aplica exclusiones, máximos y separación antes de buscar stock. Las salvaguardas de pertinencia y composición pueden reducir el resultado todavía más. El modo histórico showcase conserva sus requisitos y no recibe los límites de frecuencia natural.

## Menor entrada para Sol

El director recibe intención, restricciones concretas, referencias implementadas y frases con sus tiempos. Tipografía, color, música y sonido se aplican localmente; no se repiten como instrucciones editoriales. Se mantiene el contexto libre y las restricciones del usuario. Los cambios exclusivamente de render no invalidan la caché editorial; cambios en restricciones, discurso, referencias o política sí. La versión del director pasa a 8.

Si todos los tipos de apoyo están desactivados, no se consulta al director; se guarda `requestSkipped: true`. Continúan clasificación de fuentes y demás comprobaciones de Sol: no significa cero consultas o tokens en toda la edición.

Medición reproducible del fixture Explicativo, sin transcripción ni referencias: bloque de datos 926 → 339 bytes (63,4% menos). No es una medición de tokens ni del costo total. El ahorro total necesita una ejecución real y sus métricas.

## Validación

- TypeScript del renderer y de Next.
- Tres briefs predeterminados válidos pasan del catálogo TypeScript a los controles Python reales.
- Límites/exclusiones, contexto conservado y compatibilidad de briefs históricos.
- Ejecución aislada del bloque de dirección real: Limpio no llama al proveedor; esquema restringe tipos; caché sobrevive a cambios de fuente/color y se invalida al cambiar frecuencia.
- 420 imágenes estáticas: paleta Cutkind, sin medios/animaciones y color de exportación aislado.
- Traspaso de elecciones de `/muestras`.
- Navegador local: valor predeterminado → confirmar → seleccionar videos sin escribir; Limpio e Impacto cambian el resumen; imagen de Impacto abre con teclado; cero elementos video/audio antes de subir. Se corrigió un aviso React al alternar subrayado (propiedad textDecorationLine).
- Captura: `work/questionnaire-presets/inicio-rapido.png`.

No se generó un nuevo MP4 en esta tarea; calidad estética y consumo total siguen pendientes de una nueva edición real.
