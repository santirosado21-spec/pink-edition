# 02 · Mapa de dependencias y licencias

## Módulos

```
            ┌──────────── Navegador ────────────┐
            │ app/ (Next 16, React 19)          │
            │  ├─ landing  ├─ /estilo (quiz)    │
            │  └─ editor ── @remotion/player ───┼──► src/PinkEdit (mismo motor)
            └───────┬───────────────────────────┘
                    │ API /api/jobs, /api/profile
     modo local ────┼──── modo nube
   work/<id>/ en disco    Supabase (Postgres + Storage + Auth)
          │                       │
          ▼                       ▼
  scripts/pink_edit.py ◄── scripts/worker.py (clave de servicio)
     ├─ transcribe.py ── WhisperX (.venv-asr)
     ├─ prepare_full_demo.py ── cortes, páginas de subtítulos
     ├─ make_matte.py ── Robust Video Matting (torch.hub, .venv)
     ├─ place_graphics.py ── numpy + FFmpeg
     ├─ npx remotion render ── Chrome headless
     └─ finish_full_demo.py ── FFmpeg loudnorm + QC
  app/_lib/propose.ts ── API de Anthropic (claude-opus-5-5)
```

## Dependencias con impacto en el negocio

| Dependencia | Versión | Licencia | Qué implica | Evidencia |
| --- | --- | --- | --- | --- |
| Remotion | 4.0.534 | Licencia propia de Remotion | Gratis para personas y empresas de hasta 3 personas, incluso con uso comercial. Desde 4 personas: Company License (por uso; plan para automatización de 0.01 USD por render con mínimo de 100 USD al mes; Enterprise desde 500 USD al mes). Anuncian un cambio de licencia en la versión 5.0. | Verificado: [remotion.dev/docs/pricing](https://www.remotion.dev/docs/pricing), [FAQ](https://www.remotion.dev/docs/license-pricing-compliance/faq) |
| Robust Video Matting | modelo `resnet50` | GPL-3.0 (código) | Uso en servidor: no hay distribución, pero si el recorte llegara a ejecutarse en el dispositivo del usuario habría que publicar el código derivado. La licencia de los pesos no está clara. **Revisar con abogado.** | Verificado el código: [GitHub](https://github.com/PeterL1n/RobustVideoMatting). Pesos: hipótesis |
| WhisperX | 3.8.6 | BSD-2 según la mayoría de fuentes (una dice BSD-4) | Permisiva. Los modelos de alineación por idioma tienen sus propias licencias. | Pendiente de confirmar en su LICENSE |
| Inter Display | — | SIL OFL 1.1 (según su repositorio) | Se puede usar y empaquetar. | Hipótesis: confirmar en el repositorio de Inter |
| Efectos Kenney | — | CC0 | Sin restricciones. | Según `AUDIO_ASSETS.md` |
| Efectos Mixkit | — | Licencia gratuita de Mixkit | Uso comercial permitido sin atribución; **prohíbe revender o redistribuir los archivos**. La vista previa web descarga esos archivos al navegador: hay que confirmar que eso no cuenta como redistribución, o sustituirlos. | Verificado: [mixkit.co/llm-info](https://mixkit.co/llm-info/) |
| FFmpeg | sistema | LGPL o GPL según la compilación | La de Homebrew incluye x264 (GPL). En servidor no hay distribución. | Conocido |
| Next.js, React, supabase-js, zod, SDK de Anthropic | ver `package.json` | MIT | Sin restricciones relevantes. | — |
| Supabase | plan gratis | Servicio | 2 proyectos activos por organización; archivos de hasta 50 MB. | Observado en la cuenta |
| Vercel | — | Servicio | La landing y la web en línea; el motor no corre allí. | Probado |
| Anthropic API | `claude-opus-5-5` | Servicio | Costo por propuesta; requiere la clave. | Código escrito, sin probar |

## REA (ingeniería inversa) y Codex

- REA es MIT y su aviso legal limita el uso a software propio o autorizado. Prohíbe
  copiar código propietario y saltarse protecciones. Fuente:
  [github.com/morluto/rea](https://github.com/morluto/rea) (`DISCLAIMER.md`).
- En esta sesión ya está conectado a Claude Code. Para Codex: `npx rea-agents setup`,
  elegir Codex y aprobar los cambios (Node 22.19 o superior). No lo ejecuté porque
  modifica la configuración de Codex del dueño.
- Uso permitido en Pink.ai: auditar **nuestra** compilación y nuestros scripts, y
  estudiar proyectos de código abierto. **No** se usa sobre CapCut, Submagic, Captions,
  Descript ni OpusClip (ver `03-competidores.md`).
