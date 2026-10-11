# Costos por video y capacidad

Estimación del 11 de octubre de 2026, antes de tener la API key ni métricas reales.
Sirve para decidir precios y cuándo cambiar de infraestructura; hay que reemplazar
cada estimación por la medición en cuanto haya datos (ver «Cómo medir»).

## Supuestos

- Video de 60 s ≈ 160 palabras (la demo de piscina: 53 s, 158 palabras).
- «Proponer con IA» y «Pedir cambio» usan `claude-opus-5-5` con effort `high`
  (`app/_lib/propose.ts`). Precio: 4 USD por millón de tokens de entrada y
  20 USD por millón de salida.
- La Mac tarda unos 15 min por un video de 53 s (`PINK_AI.md`), un video a la vez.

## Claude por video

| Llamada | Entrada (aprox.) | Salida con razonamiento (aprox.) | Costo estimado |
| --- | --- | --- | --- |
| Proponer con IA | 2,500 tokens (instrucciones, transcript numerado, catálogo) | 3,000–8,000 | 0.07–0.17 USD |
| Pedir cambio (cada uno) | 3,000 tokens (lo anterior + plan actual) | 2,000–6,000 | 0.05–0.13 USD |

Con una propuesta y tres correcciones: **unos 0.25–0.55 USD por video**. La salida
domina el costo; el razonamiento de effort `high` es la parte incierta.

Palancas si sale caro, en orden: bajar a effort `medium` para «Pedir cambio» y
medir si la calidad se mantiene; después, probar `claude-sonnet-5-5`
(2/10 USD por millón) sólo para las correcciones. El cambio de modelo lo decide
Santiago; no se hace por defecto.

## Infraestructura

| Pieza | Hoy | Límite que importa | Siguiente paso y costo (verificar) |
| --- | --- | --- | --- |
| Supabase | Gratis | 50 MB por archivo, 1 GB de almacenamiento, el proyecto se pausa tras una semana sin uso | Pro: 25 USD/mes con 100 GB |
| Vercel | Hobby (gratis) | **Hobby es sólo para uso no comercial** | Pro: unos 20 USD por usuario al mes |
| Procesador | La Mac | ~4 videos por hora: ~32 al día en 8 h, uno a la vez | Segunda máquina o servidor con GPU |
| Remotion | Licencia gratuita | Hasta 3 personas en la empresa | Licencia de empresa al pasar de 3 |

Fuentes de precios (de terceros; confirmar en supabase.com/pricing y vercel.com/pricing):
[JetAdmin, Supabase 2026](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/),
[MakerKit, Supabase](https://makerkit.dev/blog/saas/supabase-pricing),
[Schematic, Vercel](https://schematichq.com/blog/vercel-pricing),
[Vendr, Vercel](https://www.vendr.com/marketplace/vercel).

## Qué significa para el precio

- El costo variable (Claude) es de centavos; lo caro es el **tiempo de la Mac**:
  con 15 min por video, la capacidad, no el costo, limita las ventas.
- Cobrar antes de pasar Vercel a Pro incumple las condiciones de Hobby.
- Un plan de 30 videos al mes para 10 clientes (300 videos) son ~75 h de
  procesador: cabe en una Mac sólo si trabaja casi todo el mes. Es el punto en el
  que hace falta un segundo procesador.

## Cómo medir

1. Con la key, correr «Proponer con IA» y «Pedir cambio» en tres videos. Cada
   llamada deja en la consola de la web una línea `[pink] <id>: N tokens de
   entrada, M de salida`.
2. Anotar el tiempo de análisis y de render de cada video
   (`docs/SECOND_VIDEO_TEST.md` ya lo pide).
3. Reemplazar las tablas de arriba con esos números.
