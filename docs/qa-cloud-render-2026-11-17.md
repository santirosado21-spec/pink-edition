# Validación cloud de Cutkind — 17 de noviembre de 2026

Base: `7a5d7ea3cd8ce06dc1c76466092fe200779f06e0`. Copia aislada; sin push ni deploy.

## Cambios

- El smoke sintético usa el Python actual para las herramientas salvo que se indique `PINK_TOOLS_PYTHON`.
- Guarda `verification.json` con estado `failed` y tipo de error si falla. Conserva el log; limpia el trabajo temporal.
- `--keep-video` permite conservar el MP4 sintético sólo tras aprobar el QC. No conserva grabaciones reales.
- Tres pruebas de contrato cubren selección de Python, override y diagnóstico/limpieza al fallar. Se incorporan a la lista Python del CI.

## Ejecución

```sh
npm ci --cache /tmp/cutkind-npm-cache
python scripts/test_render_smoke_contract.py
npm_config_cache=/tmp/cutkind-npm-cache python scripts/test_render_snapshot_e2e.py --keep-video
```

El primer `npm ci` no pudo escribir su caché predeterminada; la caché temporal resolvió la instalación sin modificar dependencias ni lockfile.

El render creó el video fuente sintético y completó el bundle. Falló al iniciar el servidor de Remotion: `uv_interface_addresses returned Unknown system error 1`, desde `os.networkInterfaces` en `@remotion/renderer/dist/port-config.js`. Un reintento con ejecución escalada autorizada produjo el mismo error. No se cambiaron las restricciones ni se sustituyó la API de red.

No hay MP4 final validado, QC final ni aprobación estética. El tono sintético y los captions de fixture tampoco pueden validar conservación de voz, detección de cara o calidad editorial. El próximo paso es ejecutar el mismo smoke en un runner que permita las APIs de red requeridas por Remotion, antes de probar material real autorizado.

## Actualización de seguridad aislada

El build inicial compiló, pero terminó con `SecurityFatalError` por Next 16.4.0. `npm audit --json` confirmó avisos críticos para Next; no demuestra explotación ni exposición de una instalación concreta. Se actualizó únicamente Next a 16.4.6 con versión exacta y lockfile consistente. La auditoría posterior ya no registra Next ni vulnerabilidades críticas; conserva 11 dependencias vulnerables (10 altas y 1 moderada), principalmente la cadena de Remotion/Zod y fast-uri. No se cambió Remotion para no mezclar una actualización del motor audiovisual con este parche.

Avisos de Next reportados por npm: GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r, GHSA-673q-mjm6-r5xr y GHSA-mfr8-8qww-v76h. La corrección sólo está en esta copia, no en GitHub ni en un despliegue.

## Resultado final de comprobaciones

Tras el cambio a Next 16.4.6:
- `npm run typecheck`: aprobado.
- `npm run web:build`: aprobado, salida 0.
- Lista explícita del CI: 23 scripts JavaScript y 18 Python aprobados (41 scripts, no 41 aserciones). Incluye las tres pruebas nuevas de contrato.
- `git diff --check`: aprobado.
- Render sintético: bloqueado por el error de interfaces de red descrito arriba. No se declara aprobado.
