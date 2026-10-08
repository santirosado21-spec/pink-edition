# Recursos de audio

Consulta: 8 de octubre de 2026. Hay un efecto al inicio, uno en cada corte de
toma y los de las tarjetas; no se aplica un sonido a cada palabra. Se eligieron
por título, duración y niveles medidos; falta aprobarlos de oído.

| Archivo | Procedencia | Licencia | Uso |
| --- | --- | --- | --- |
| `audio/mixkit/air-zoom-2608.wav` | Mixkit, Air zoom vacuum, item 2608 | Mixkit Sound Effects Free License | Inicio del video |
| `audio/mixkit/sweep-166.wav` | Mixkit, Fast small sweep transition, item 166 | Mixkit Sound Effects Free License | Cortes de toma, alternado |
| `audio/mixkit/swoosh-3115.wav` | Mixkit, Fast transitions swoosh, item 3115 | Mixkit Sound Effects Free License | Cortes de toma, alternado |
| `audio/kenney/glass_001.ogg` | Kenney Interface Sounds 1.0 | CC0; licencia adjunta | Entrada de cada tarjeta |
| `audio/kenney/glass_005.ogg` | Kenney Interface Sounds 1.0 | CC0; licencia adjunta | Énfasis dentro de la tarjeta |

`tick_001.ogg`, `switch_001.ogg` y el whoosh 1492 de Mixkit se usaron hasta el v5
y ya no están en el config.

[Transiciones de Mixkit](https://mixkit.co/free-sound-effects/transition/)
y [licencia específica](https://mixkit.co/license/modal/sfxFree/).
[Página de Kenney](https://kenney.nl/assets/interface-sounds).

Los assets de Mixkit no se distribuyen dentro de Git; cada checkout los prepara
con `npm run setup:audio`. Kenney y su licencia CC0 sí se incluyen.
Archivos, ganancias y tiempos viven en `full-demo-config.json` (`audio`).
