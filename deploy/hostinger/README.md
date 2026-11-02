# Despliegue web en Hostinger

Este despliegue publica la web de Pink.ai en `pink.srv1971153.hstgr.cloud` sin
ejecutar el motor de video en el VPS compartido con el trading bot.

El contenedor comparte únicamente la red del proxy y tiene límites de 0.25 CPU,
384 MB de memoria y 128 procesos. `VERCEL=1` mantiene desactivado el motor local:
evita que una subida lance Whisper, recorte o Remotion en el servidor de trading.

```sh
docker compose -p pink-ai -f deploy/hostinger/compose.yml up -d --build
```

Antes de recargar Caddy, se añade `Caddyfile.pink` al archivo activo y se valida
la configuración dentro del contenedor del proxy. La recarga no reinicia Caddy.

El procesador debe ejecutarse en otra máquina o después de ampliar el VPS. Para
compartir servidor con trading se recomienda al menos 4 vCPU y 16 GB, con el
worker limitado a 2 vCPU y 8 GB. La web puede permanecer con estos límites.

## Despliegue activo

- URL: `https://pink.srv1971153.hstgr.cloud`
- Release: `20261014T182239Z`
- Imagen: `pink-ai-web:20261014`
- Contenedor: `pink-ai-web`
- Red compartida: sólo `tradingbot-wallets_default`, para que Caddy pueda
  resolver el servicio por nombre; Pink.ai no publica puertos del host.
- Protección del host: swap de 2 GB y `vm.swappiness=10`.
- Estado funcional: landing y aplicación web activas; procesamiento de video
  deshabilitado de forma explícita para proteger el trading en KVM 1.

El Caddyfile activo se respaldó como
`Caddyfile.pre-pink-20261014T182239Z`. La configuración se validó antes de una
recarga en caliente; los contenedores del trading no se reiniciaron.

Hostinger mostró KVM 4 con 4 vCPU, 16 GB de RAM, 200 GB NVMe y 16 TB de ancho
de banda. Es el mínimo recomendado para probar el worker en el mismo VPS con
límites estrictos; aun así, un worker separado mantiene el trading mejor
aislado.
