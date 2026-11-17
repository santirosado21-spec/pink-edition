# Segunda validación cloud: dependencias — 17 de noviembre de 2026

Parche independiente sobre `37dd49a2d4d83aaec7ab31f227569855bf14cb64`. Branch `dot/cloud-dependency-security`. Sin push, deploy ni modificación de producción. El parche previo permanece en `dot/cloud-render-validation`.

## Diagnóstico

Los 11 paquetes que marcaba npm no representan 11 fallos independientes: Zod es la raíz de los 10 avisos altos (incluye nueve paquetes Remotion por propagación), y fast-uri concentra cuatro avisos de severidad baja/moderada en un solo paquete.

- Zod: consumo excesivo de memoria al validar colecciones; corrección desde 4.6.6. Referencia: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 . Cutkind importa Zod tanto en composición como en validación de propuestas. Esta revisión no prueba explotación ni accesibilidad externa de una ruta concreta.
- fast-uri 3.1.8: normalización/confusión de esquemas, rutas y hosts. Dependencia indirecta de AJV/schema-utils/webpack en el bundler Remotion. Corrección compatible 3.1.9. Referencias: https://github.com/advisories/GHSA-w74x-v6f9-j3xg , https://github.com/advisories/GHSA-xhq7-xmqj-769h , https://github.com/advisories/GHSA-wjr9-j795-jxcr , https://github.com/advisories/GHSA-333x-w4r6-6crp . No se identificó uso directo de fast-uri por la aplicación en esta revisión; no equivale a demostrar que sea inexplotable.

Actualizar sólo Zod raíz dejaría las copias 4.5.4 fijadas por Remotion 4.0.534. Forzar overrides alteraría esas restricciones. Se prefirió actualizar conjuntamente todos los paquetes Remotion directos a 4.0.544, cuya dependencia nativa es Zod 4.6.7, y usar esa misma versión en la raíz. No se modificaron modelos, proveedores ni decisiones editoriales.

## Cambios reproducibles

```sh
npm install --save-exact @remotion/captions@4.0.544 @remotion/cli@4.0.544 @remotion/fonts@4.0.544 @remotion/media@4.0.544 @remotion/player@4.0.544 remotion@4.0.544 zod@4.6.7
npm update fast-uri
npm audit --json
```

Las versiones directas siguen exactas. fast-uri permanece transitivo, ahora 3.1.9. No hay overrides ni actualización mayor forzada. El lockfile incluye los cambios transitivos legítimos del motor; no es un parche de una única librería. Todos los paquetes `@remotion/*` del lockfile quedan alineados en 4.0.544; Zod queda deduplicado en 4.6.7. Next continúa en 16.4.6 del parche previo.

## Comprobaciones

- Auditoría npm: cero vulnerabilidades conocidas en el árbol consultado. No demuestra ausencia de vulnerabilidades desconocidas ni corrige un despliegue existente.
- Lista explícita del CI: 23 scripts JavaScript y 18 Python aprobados, 41 scripts en total (no aserciones).
- Instalación limpia `npm ci` desde el lockfile: aprobada.
- TypeScript: aprobado.
- Build web: aprobado (Next 16.4.6, salida 0).
- Render sintético: vuelve a completar el bundle y falla antes de obtener composición por `uv_interface_addresses returned Unknown system error 1`, en `os.networkInterfaces` llamado por Remotion. No se alteró ni sustituyó esa API. Evidencia del intento: `b6fa74e1-8b43-47de-beb2-6a9e59dfcfd4`.

## Límite de integración

La compatibilidad de tipos, lógica y build no sustituye probar el motor audiovisual actualizado: no hay MP4 final ni QC audiovisual/estético aprobado. Repetir el smoke en un runner compatible antes de aprobar una publicación, y luego validar material real autorizado sin subirlo a terceros. La auditoría y los logs corresponden sólo a esta copia cloud.
