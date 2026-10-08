# Recursos de audio

Consulta: 7 de octubre de 2026. Los efectos acompañan entradas de tarjetas y
un énfasis gráfico; no se aplica un sonido a cada palabra.

| Archivo | Procedencia | Licencia | Uso |
| --- | --- | --- | --- |
| `audio/mixkit/whoosh-soft.wav` | Mixkit, Cinematic whoosh fast transition, item 1492 | Mixkit Sound Effects Free License | Tres entradas de tarjeta; filtro y atenuación de la grabación original |
| `audio/kenney/tick_001.ogg` | Kenney Interface Sounds 1.0 | CC0; licencia adjunta | Selección de un paciente y segunda barra |
| `audio/kenney/switch_001.ogg` | Kenney Interface Sounds 1.0 | CC0; licencia adjunta | Flecha de presión ascendente |

[Página de Mixkit](https://mixkit.co/free-sound-effects/whoosh/)
y [licencia específica](https://mixkit.co/license/modal/sfxFree/).
[Página de Kenney](https://kenney.nl/assets/interface-sounds).

El asset Mixkit no se distribuye como biblioteca dentro de Git; cada checkout
lo prepara con `npm run setup:audio`. Kenney y su licencia CC0 sí se incluyen.
Las entradas, duración y ganancias viven en `full-demo-config.json`.
