# 01 · Auditoría técnica de Pink.ai

Fecha: 14 de octubre de 2026. Rama auditada: `main` en `2ed1222` (cuestionario de
estilo incluido). Todo lo marcado **medido** se midió en la Mac del dueño durante esta
sesión; lo marcado **probado** se ejecutó de punta a punta; lo demás es lectura de código.

## 1. Qué hay hoy

| Pieza | Dónde | Estado |
| --- | --- | --- |
| Motor de edición | `src/` (Remotion 4.0.534, composición `PinkEdit`) | Probado. Estilo (STYLE) y decisiones (PLAN) separados; todo anclado a palabras. |
| Pipeline | `scripts/pink_edit.py` | Probado con 3 videos reales (piscina 104 s, interiores 71 s, recorte de 24 s). |
| Catálogo de gráficos | `src/graphics/cards.tsx` | 13 tarjetas, cortes de color (papel y sólido), 3 fondos, efectos de sonido derivados del estilo. |
| Preferencias del creador | `src/preferences.ts`, `/estilo` | Probado: color de marca con tinta legible, sonido completo, suave o ninguno; sin preferencias el resultado es idéntico byte a byte. |
| Web | `app/` (Next.js 16.4, React 19) | Probado en local: subida, editor con línea de tiempo, deshacer, vista previa en vivo, render, descarga, cuestionario. |
| Modo nube | `app/_lib/cloud.ts`, Supabase | Base y permisos probados con reversión; **sin probar con una sesión real**. |
| Procesador | `scripts/worker.py` | Probado con cola local: retoma trabajos a medias, tope de 45 min, copia liviana si no cabe. |
| Propuesta con IA | `app/_lib/propose.ts` | **Sin probar** (falta `ANTHROPIC_API_KEY`). Reglas fijas probadas con propuesta ficticia. |
| Landing | `app/page.tsx` | Publicada en Vercel detrás de la protección de Vercel. |

## 2. Cómo fluye un video

```
original ─► conform (FFmpeg, 30 fps) ─► transcribe (WhisperX small, CPU)
        ─► cut (quita pausas, conserva cada palabra) ─► matte (Robust Video Matting, MPS)
        ─► place (tarjetas sobre la persona) ─► [plan: manual hoy, IA mañana]
        ─► render (Remotion) ─► finish (−14 LUFS, QC de palabras, duración y decodificación)
```

## 3. Tiempos medidos

| Video | Duración | Transcribir | Cortar | Recorte de persona | Análisis total | Render + QC |
| --- | --- | --- | --- | --- | --- | --- |
| Interiores | 71 s | ~20 s | ~5 s | **366 s** | 402 s | 126 s (64.6 s de salida) |
| Recorte de piscina | 24 s | — | — | — | 72 s | — |

Conclusión: el **recorte de la persona es el 91 % del análisis** (unas 5 veces la
duración del video en la Mac). Un video de un minuto tarda unos 9 minutos de máquina,
más el tiempo de poner gráficos a mano. Con un video a la vez, la Mac procesa unos
6 videos por hora sin intervención humana.

## 4. Verificaciones de esta auditoría

- **Código que llega al navegador** (REA `analyze_javascript_application` sobre nuestra
  propia compilación, más búsqueda de texto): 18 archivos, 1.75 MB. No contiene la clave
  de servicio de Supabase, la de Anthropic ni el SDK de Anthropic. REA marcó la
  cobertura semántica como parcial por límites de memoria; la búsqueda de texto cubre
  el resto.
- **Supabase**: avisos de seguridad sin hallazgos; RLS de `videos`, `jobs`, `edit_plans`,
  `renders` y `profiles` probada con usuarios ficticios y reversión.
- **Regresión del motor**: diez cuadros y diez segundos de audio idénticos entre la
  versión anterior y la actual con el plan de piscina.

## 5. Riesgos y deuda, por prioridad

| # | Riesgo | Impacto | Propuesta |
| --- | --- | --- | --- |
| 1 | La propuesta con IA nunca se ha ejecutado | Sin ella, cada video necesita gráficos a mano: no escala | Conseguir la clave y correr `scripts/propose_smoke.py` (POC 1) |
| 2 | Un video a la vez; la subida se rechaza si hay otro en proceso | Con 30–120 videos al mes, el piloto se atasca | Cola de trabajos en modo local |
| 3 | Recorte lento sin GPU (5× tiempo real en la Mac; peor en el VPS básico) | Tiempos de entrega y costo de servidor | Modelo de recorte más ligero o GPU por uso (ver 05) |
| 4 | Transcripción con el modelo `small` | Errores como «pobres extrema» por «pobreza extrema» | Modelo mayor local o API de transcripción (ver 05) |
| 5 | La vista previa usa WebM con transparencia, que Safari no reproduce | En iPhone la persona no se vería delante de las tarjetas | Versión HEVC con transparencia para Safari |
| 6 | Clips muy cortos (6 s) fallan el control de volumen (−15.75 LUFS) | Render marcado como fallido | Revisar la normalización para clips cortos |
| 7 | Modo nube sin sesión real; registro abierto en Supabase | Riesgo de abuso al publicar | Apagar el registro en el panel y probar con un correo real |
| 8 | Sin pruebas automáticas | Regresiones silenciosas | Pruebas de validación, preferencias y reglas |
| 9 | El repositorio vive en el Escritorio sincronizado con iCloud | Aparecen copias «… 2» de archivos (`CLAUDE 2.md`, `public/landing/* 2.mp4`, `.next/dev/types/routes.d 2.ts`) que rompen la comprobación de tipos del build | Mover el proyecto fuera de la carpeta sincronizada |
| 10 | El recorte descarga el modelo de GitHub en tiempo de ejecución (`torch.hub`) | Falla si GitHub no responde | Guardar los pesos en el proyecto o en un almacenamiento propio |

## 6. Lo que hay que conservar

El contrato STYLE/PLAN anclado a palabras, la validación del plan en dos capas (web y
procesador), el QC técnico de cada entrega, las preferencias que no cambian nada cuando
no existen, y la regla de no inventar cifras en los gráficos. Todo lo nuevo debe entrar
como parámetros de STYLE o eventos de PLAN, no como excepciones en el motor.
