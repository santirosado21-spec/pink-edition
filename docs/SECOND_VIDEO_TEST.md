# Probar Pink.ai con otro video

Todo el sistema se probó con un solo video (piscina, español, una persona sentada).
Esta lista sirve para saber si funciona con otro material antes de confiar en él.

## Qué video usar

Un reel vertical de 30 a 90 s, una persona hablando a cámara, en español, de un
tema distinto (dinero, fitness, tecnología…). Conviene que **no** tenga la misma
cámara ni el mismo fondo. Máximo 120 s y 500 MB (`style/pink-demo-v1.json`).

## Pasos

1. `npm run web` y subir el video en http://localhost:3000/app (o
   `python3 scripts/pink_edit.py video.mp4 --prepare-only`).
2. Esperar a «Listo para editar» (unos 5 min por minuto de video).
3. Con `ANTHROPIC_API_KEY` en `.env.local`: «Proponer con IA», o
   `python3 scripts/propose_smoke.py <id>` para validar densidad y solapes.
4. Revisar la vista previa y renderizar. Con `--review` el pipeline genera frames
   en `work/<id>/review/`.

## Qué mirar

| Revisar | Falla típica |
| --- | --- |
| Transcripción | Palabras mal escuchadas, cifras o siglas; corregir con `work/<id>/corrections.json` |
| Cortes de silencio | Una pausa dramática quitada o una muletilla conservada |
| Recorte de la persona | Bordes con ruido, manos que desaparecen, fondo claro/oscuro difícil |
| Tarjetas | Que no tapen la cabeza (`place_graphics.py` avisa si no caben) |
| Colores por tema | Rojo/verde que no corresponden a lo dicho |
| Captions | Palabras que pasan sin leerse (`review_frames.py` avisa) |
| Sonido | Volumen de efectos frente a la voz; se aprueba de oído |

## Qué reportar

Duración, tiempo de análisis y de render, y qué de la tabla falló. Con eso se ajusta
el estilo o el catálogo de tarjetas.
