# Mapa de trabajo: de «QC técnico en verde» a «lo publicarías»

2 de noviembre de 2026. Método: **dsystem**. Claude Opus 5.5 hizo este mapa y dirige el diseño y el triage. Codex implementa y verifica, Gemma (`localllm`) hace el texto sencillo y Gemini (`opinion`) da segundas opiniones puntuales. Una crítica de Gemini a la primera versión cambió tres cosas, marcadas con (G).

## Dónde estamos

- El motor funciona de punta a punta en la Mac: Whisper → cortes → recorte → director Sol → Remotion → QC. La última ronda (`work/fran-loop/20261027-182306`) tiene QC técnico, audio, voz completa y revisión visual del modelo **en verde**.
- **Ningún MP4 tiene veredicto del dueño.** Todo `feedback.json` está vacío. Sin esa señal no hay forma de saber si mejoramos.
- Casi todo se probó con 2 o 3 videos de 2 temas (piscina, estrés, tiempo).
- Hay un loop de evaluación: `python3 scripts/pink_loop.py` (gates → estado → review → next → run).
- La rama `claude/plataforma-v2` tiene unos 278 archivos sin commit. **Antes de que Codex edite**, el dueño decide si se hace commit de ese estado o se abre una rama nueva. Ningún agente hace commit sin que se lo pidan.

## Métrica

- **Primaria:** nota del dueño en los clips **reservados**: media ≥ 4/5 y al menos 4 de 6 clips con «publicable» ≥ 4.
- **Restricciones duras**, que no se compensan con nota: cero pérdida de voz, cero cifras inventadas, cero oclusión del rostro o de los subtítulos, original intacto.
- **Registro:** minutos de render y llamadas a Sol por MP4 aceptado. La cuota es desconocida, se mide sin inventar porcentajes.
- (G) **La review separa causa de síntoma.** Las dimensiones pasan a ser:
  - *propuesta editorial*: qué apoyo y en qué momento;
  - *ejecución visual*: cómo se ve la tarjeta, la letra y la composición;
  - *ritmo*;
  - *publicable*;
  - un comentario con video, segundo y cambio.

  Así una nota baja dice si se arregla el director o el diseño.

## Fases y puertas de salida

| Fase | Qué | Puerta de salida | Quién |
|---|---|---|---|
| **F0** | Puntuar la ronda `20261027-182306` | 1 veredicto guardado | Dueño (5 min) |
| **F1** | Corpus de **12 clips crudos** (G): 6 de desarrollo y 6 reservados, de ≥ 5 temas, en español, de 30–90 s, con un solo hablante, vertical o recortable | `work/corpus/manifest.jsonl` con origen, licencia, sha256 y división por clip; el dueño aprueba la lista | Dueño (grabaciones o CC), Codex (W2), Gemma (temas) |
| **F2** | Línea base: **sólo el preset Explicativo** (G) sobre los 6 de desarrollo | Gates en verde y 6 veredictos guardados; números base en el ledger | Codex lanza, dueño puntúa |
| **F3** | Cerrar brechas por la dimensión peor puntuada; máximo 2 pasadas por hallazgo | Métrica primaria cumplida en los 6 reservados y restricciones duras en cero | Claude (triage y diseño), Codex (implementación) |
| **F3b** | Añadir Limpio e Impacto cuando Explicativo pase | Las mismas restricciones; media ≥ 4 en desarrollo | Igual |
| **F4** | Aprender correcciones con alcance («sólo este video» o «mi perfil»), versionadas y reversibles | Una corrección recordada mejora un video nuevo sin romper los anteriores | Codex, con revisión de arquitectura de Claude |
| **F5** | Producción: nube, VPS con GPU, subida reanudable | No empieza hasta pasar F3 | Más adelante |

**Regla de los reservados:** se renderizan y se puntúan sólo al cerrar un ciclo de F3. Sus comentarios se registran, pero **no** entran en `next` ni en los ajustes. Si se ajusta sobre ellos, dejan de medir.

## Cada vuelta del loop

```
Codex:  cambio acotado en rama → pink_loop.py gates (verde obligatorio)
Codex:  pink_loop.py run --yes            (con OK del dueño: envía texto/fotogramas a Sol)
Gemma:  resume quality.json + render.log en 5 viñetas → notas de la ronda (Codex coteja)
Dueño:  pink_loop.py review               (5 notas + comentario por video)
Claude: triage del ledger → órdenes de trabajo clasificadas (editorial / visual / ritmo / técnico)
        y diseño de las visuales
Gemini: sólo si una decisión queda ambigua (1 consulta por decisión, texto sin datos privados)
Codex:  implementa → pink_loop.py next → vuelta siguiente
```

No se encadenan revisiones entre modelos de forma automática. Una llamada fallida no cuenta como revisión. Si Claude o Gemini se quedan sin cuota, Codex continúa con Gemma y lo registra.

## Órdenes de trabajo

### W1 · Codex — loop v2 (pequeña, la primera)
- `review`: dimensiones *editorial, visual, ritmo, publicable* y comentario.
- **Review a ciegas:** no mostrar el preset ni la versión. El mapa ciego se guarda aparte y se revela en `status`.
- `history`: notas por ronda y dimensión, con la tendencia y las restricciones duras.
- Etiqueta `split: dev|holdout` por video. `next` ignora el feedback de los holdout.
- Pruebas con `PINK_LOOP_ROUNDS` y `PINK_LOOP_STATE` en un directorio temporal, sin tocar rondas reales.
- **Acepta si:** pruebas en verde, `status` sobre la ronda real no cambia de comportamiento y el ledger antiguo sigue leyéndose.

### W2 · Codex + Gemma — ingreso al corpus
- `scripts/corpus_add.py <archivo> --source <url|propio> --license <id>`:
  - copia a `work/corpus/raw/` sin tocar el original;
  - calcula sha256 y lee orientación y duración con `media_intake.inspect`;
  - rechaza material ya editado (ruta `reference`) y lo deja como referencia;
  - asigna el split de forma determinista por hash.
- Gemma (`localllm --json`) etiqueta el tema a partir de la transcripción local. Codex valida el JSON y lo coteja.
- **Sin descargas automáticas.** `yt-dlp` no está instalado; instalarlo o descargar de YouTube requiere el OK del dueño y una licencia verificada por clip.
- **Acepta si:** el manifiesto es reproducible, no hay duplicados, ningún clip queda sin licencia y el original no cambia.

### W3 · Codex — rondas desde el corpus
- `pink_loop.py run --split dev --preset explicativo` arma la config de `fran_loop.py` a partir del manifiesto.
- `fran_loop.py` admite 1 o 2 proyectos crudos por ronda, así que las rondas van por lotes de 2 o se sube ese límite con una prueba.
- **Acepta si:** una ronda real de 2 clips termina, archiva y aparece en `status`.

### W4 · Gemma (orquestado por Codex) — notas de ronda
- `cat quality.json render.log | localllm "5 viñetas: fallos, avisos, tiempos"` → `notes.md`.
- Codex comprueba cada afirmación contra el JSON. Gemma no decide nada.

### W5 · Claude — triage y diseño (por ronda)
- Lee el ledger y los fotogramas, y clasifica cada nota ≤ 3 por causa.
- Las causas visuales (tarjetas, colocación, contraste, tipografía) las diseña Claude con las skills de diseño globales. Codex las implementa y las verifica con render.
- Respeta las reglas del proyecto:
  - Inter Display a 100 px en la demo de piscina; los presets nuevos usan su familia propia;
  - sin cifras ni CTA inventados;
  - en la web, sin animaciones;
  - sin música en el producto.

## Fuera de alcance por ahora

Nube y VPS, pagos, app con Capacitor, generación de video por IA y música. Nada de esto mejora la nota del dueño hoy.

## Avance

| Orden | Estado (2 nov 2026) |
|---|---|
| W1 | Hecha. Codex construyó, Claude inspeccionó y pidió una ronda de correcciones: la review a ciegas se filtraba vía `status` y había un mensaje engañoso en `next`. Hay 7 pruebas y un gate «loop de evaluación». |
| W2 | Hecha. Codex construyó y Claude inspeccionó. 6 pruebas, más una prueba real con Gemma que etiquetó bien el tema. |
| W3 | Hecha. Codex construyó y Claude inspeccionó. `run --split dev --preset explain [--dry-run]`; el brief sale de `src/intakePresets.ts` y el holdout exige `--holdout-cycle`. 12 pruebas. |
| Push | Hay commits locales en `claude/plataforma-v2`. Están retenidos porque el repo de GitHub es **público** y el dueño debe decidir la visibilidad. |

Pregunta abierta para el dueño: los presets del 28 de octubre llevan `musicMood`, y eso choca con la decisión del 10 de octubre de no poner música en el producto.

## Próximo paso

1. ~~El dueño decide qué hacer con los 278 cambios sin commit.~~ Hecho: hay commits locales.
2. Dueño: F0, con `python3 scripts/pink_loop.py review`.
3. Codex: W1.
4. Dueño: empieza a juntar los 12 clips; las grabaciones propias son la mejor fuente.
