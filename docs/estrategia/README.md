# Estrategia técnica de Pink.ai — resumen de una página

**Dónde estamos.** El motor y la web funcionan de punta a punta en la Mac: un video de
un minuto tarda unos 9 minutos de máquina, y el 91 % de eso es recortar a la persona.
La primera edición automática con IA está escrita pero nunca se ha ejecutado.
Detalle en [01-auditoria.md](01-auditoria.md).

**Qué hacen los competidores.** Todos ofrecen un catálogo de estilos de subtítulos con
palabra clave resaltada, zooms y efectos automáticos, y kits o plantillas de marca.
Descript y CapCut editan por transcripción. **Ninguno de los cinco documenta aprender el
estilo de un video de referencia ni aprender de las correcciones del creador.**
Detalle con fuentes en [03-competidores.md](03-competidores.md).

**Arquitectura.** Style DNA → análisis con modelos intercambiables → Claude propone y
reglas fijas validan → motor determinista con efectos parametrizados → QC y aprendizaje.
Detalle en [04-arquitectura.md](04-arquitectura.md); matriz en [05-matriz.md](05-matriz.md).

**Siguientes cinco pruebas** ([06-pocs-y-plan.md](06-pocs-y-plan.md)):
1. Primera edición automática con Style DNA (necesita la clave de Anthropic).
2. Presets de subtítulos.
3. Zooms y transiciones con sonido.
4. Edición por transcripción.
5. Estilo desde un video de referencia.

## Decisiones que te tocan

1. **Clave de Anthropic.** Sin ella no hay primera edición automática, que es el
   corazón del producto.
2. **Licencias.** Remotion pide licencia de pago desde 4 personas en la empresa. El
   recorte de persona es GPL-3.0 y no está clara la licencia de sus pesos. Los efectos
   de Mixkit prohíben redistribuir los archivos, y la vista previa web los descarga al
   navegador. Conviene revisarlo con un abogado antes de vender
   ([02-dependencias.md](02-dependencias.md)).
3. **Mover el proyecto fuera del Escritorio con iCloud.** iCloud está creando copias
   «… 2» de archivos que rompen el build.
4. **Exportar un mismo video desde Submagic o CapCut** para pasar de lo que ellos dicen
   a lo que medimos.
5. **REA en Codex:** correr `npx rea-agents setup` y elegir Codex. Úsalo sólo en
   software propio o autorizado.
