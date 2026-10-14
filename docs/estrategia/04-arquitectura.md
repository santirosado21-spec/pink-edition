# 04 · Arquitectura híbrida de Pink.ai

## Por qué no basta con «usar Claude Code»

Claude Code puede escribir una edición para un video si alguien instala el motor, sabe
depurarlo y revisa cada cuadro. Pink.ai tiene que dar, sin nada de eso:

1. **Repetibilidad:** el mismo plan produce el mismo video; un motor determinista, no
   código improvisado por video.
2. **Memoria del creador:** su estilo y lo que corrige se reutilizan en cada video.
3. **Garantías:** cada entrega pasa QC (todas las palabras, volumen, duración,
   decodificación) y el plan se valida antes de gastar cómputo.
4. **Cero configuración y volumen:** subir, recibir; colas, GPU y costos controlados.

## Capas

```
┌─ 1. Style DNA ─────────────────────────────────────────────────┐
│ Cuestionario (hoy) + estilo medido de una referencia (POC 5)    │
│ + pesos aprendidos de correcciones (POC 6) → preferencias       │
└──────────────────────┬─────────────────────────────────────────┘
                       ▼
┌─ 2. Análisis (modelos intercambiables) ────────────────────────┐
│ Transcripción  │ Recorte de persona │ Rostro/encuadre │ Audio   │
│ WhisperX hoy   │ RVM hoy            │ (nuevo)         │ energía │
│ ⇄ API externa  │ ⇄ modelo ligero/GPU│                 │         │
└──────────────────────┬─────────────────────────────────────────┘
                       ▼
┌─ 3. Cerebro editorial ─────────────────────────────────────────┐
│ Claude con salida estructurada → propuesta de PLAN              │
│ + reglas fijas (densidad, preferencias, catálogo) → PLAN válido │
└──────────────────────┬─────────────────────────────────────────┘
                       ▼
┌─ 4. Motor determinista (Remotion, PinkEdit) ───────────────────┐
│ STYLE + PLAN + montaje + medios → video, anclado a palabras     │
│ Biblioteca de efectos parametrizados:                           │
│ subtítulos · tarjetas · cortes de color · fondos · zooms ·      │
│ transiciones · efectos de sonido                                │
└──────────────────────┬─────────────────────────────────────────┘
                       ▼
┌─ 5. Entrega y aprendizaje ─────────────────────────────────────┐
│ QC técnico → MP4 · el editor guarda versiones → diferencias      │
│ entre propuesta y versión final → actualiza el Style DNA         │
└────────────────────────────────────────────────────────────────┘
```

## Decisiones de diseño

1. **Todo efecto nuevo es un parámetro de STYLE o un evento de PLAN**, anclado a una
   palabra, con valores por defecto que reproducen el look actual. Así lo aprendido en
   el cuestionario de estilo se repite: sin preferencias, nada cambia.
2. **Interfaces por función de análisis.** Cada modelo se envuelve en un script con la
   misma salida JSON que hoy (`transcript.json`, `person.webm`). Cambiar WhisperX por
   una API, o RVM por un modelo ligero, no toca el motor.
3. **La IA propone; las reglas deciden.** Claude elige frases y efectos del catálogo; el
   código descarta lo que viole las reglas (densidad, preferencias, cifras no dichas).
   El creador siempre ve y corrige el plan antes del render.
4. **El aprendizaje empieza simple:** contar qué acepta, borra o cambia el creador por
   tipo de elemento y tema, y convertir esos conteos en preferencias y en contexto para
   la propuesta. Nada de entrenar modelos hasta tener cientos de videos.
5. **APIs externas sólo donde no diferencian:** transcripción y B-roll de stock son
   candidatos; subtítulos, efectos, estilo y aprendizaje se construyen dentro.

## Estado de cada capa

| Capa | Hoy | Siguiente paso |
| --- | --- | --- |
| Style DNA | Cuestionario (v0) | Estilo de subtítulos y ritmo; medir referencias (POC 5) |
| Análisis | WhisperX `small`, RVM | Interfaz común; probar un modelo de recorte más rápido |
| Cerebro editorial | Escrito, sin probar | POC 1 con la clave de Anthropic |
| Motor | 13 tarjetas, cortes, fondos, sonido | Presets de subtítulos (POC 2), zooms y transiciones (POC 3) |
| Entrega | QC técnico, versiones del plan | Edición por transcripción (POC 4); registrar diferencias para aprender |
