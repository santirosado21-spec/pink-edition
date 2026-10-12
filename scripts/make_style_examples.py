"""Renderiza los clips de ejemplo del cuestionario de estilo (`public/estilo/`).

Cada clip es un tramo corto de un trabajo ya analizado, editado por el motor con una
opción distinta del cuestionario: así el creador ve cómo quedaría su video.
"""

import argparse
import json
import re
import subprocess
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT / "public/estilo"
# Mismos colores sugeridos que `PRESETS` en app/_components/StyleQuiz.tsx.
PRESETS = ["1f5fc4", "e63b7a", "19a974", "ff6b00", "7c3aed", "ffd400"]
HOUSE = {"topic": "", "vibe": "dynamic", "graphics": "many", "brand_color": "#1f5fc4",
         "context_colors": True, "sfx": "full", "notes": ""}
ALL = None

# (nombre, tramo en frames del montaje, elementos del plan que se conservan, preferencias,
# segundo del clip que sirve de portada). Los tramos e identificadores son del plan de piscina.
VIBE, GRAPHICS, COLOR, CONTEXT, SOUND = (260, 470), (700, 900), (330, 465), (262, 390), (255, 400)
EXAMPLES = [
    ("vibe-dynamic", VIBE, ALL, {}, 0.7),
    ("vibe-balanced", VIBE, {"patients", "doctor"}, {"vibe": "balanced"}, 3.2),
    ("vibe-clean", VIBE, set(), {"vibe": "clean", "sfx": "soft"}, 3.2),
    ("graphics-many", GRAPHICS, ALL, {}, 1.6),
    ("graphics-few", GRAPHICS, {"emergency"}, {"graphics": "few"}, 1.6),
    ("graphics-none", GRAPHICS, set(), {"graphics": "none"}, 1.6),
    *[(f"color-{color}", COLOR, ALL, {"brand_color": f"#{color}", "context_colors": False}, 3.2)
      for color in PRESETS],
    ("context-on", CONTEXT, ALL, {}, 0.6),
    ("context-off", CONTEXT, ALL, {"context_colors": False}, 0.6),
    ("sfx-full", SOUND, ALL, {}, 2.9),
    ("sfx-soft", SOUND, ALL, {"sfx": "soft"}, 2.9),
    ("sfx-none", SOUND, ALL, {"sfx": "none"}, 2.9),
]


def run(arguments, **options):
    return subprocess.run([str(a) for a in arguments], check=True, cwd=PROJECT, **options)


def voice_gain(render):
    """Ganancia fija que deja el pico del clip en -1.5 dB.

    Sin limitador ni nivelado. El pico lo marca la voz, igual en las variantes de un
    mismo tramo: la diferencia entre efectos completos, suaves y ninguno se conserva.
    """
    report = run(["ffmpeg", "-hide_banner", "-nostats", "-i", render, "-map", "0:a:0",
                  "-af", "aformat=sample_fmts=flt,astats", "-f", "null", "-"],
                 text=True, capture_output=True).stderr
    # En coma flotante: la voz del render puede pasar de 0 dB antes de normalizarse.
    return -1.5 - float(re.findall(r"Peak level dB: (-?[\d.]+)", report)[-1])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--job", default="piscina-e2e", help="Trabajo ya analizado en work/.")
    parser.add_argument("--only", help="Prefijo de los ejemplos a regenerar, p. ej. «color».")
    parser.add_argument("--reuse", action="store_true",
                        help="No vuelve a renderizar lo que ya está en work/<job>/examples/.")
    args = parser.parse_args()
    work = PROJECT / "work" / args.job
    props = json.loads((work / "props.json").read_text(encoding="utf-8"))
    plan = json.loads((work / "plan.json").read_text(encoding="utf-8"))
    plan.pop("music", None)
    scratch = work / "examples"
    scratch.mkdir(exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, (first, last), kept, preferences, cover in EXAMPLES:
        if args.only and not name.startswith(args.only):
            continue
        variant = {**plan, "preferences": {**HOUSE, **preferences}}
        for group in ("cuts", "cards", "backgrounds"):
            variant[group] = [event for event in plan[group] if kept is ALL or event["id"] in kept]
        file = scratch / f"{name}.json"
        file.write_text(json.dumps({**props, "plan": variant}, ensure_ascii=False), encoding="utf-8")
        render = scratch / f"{name}.mp4"
        if not (args.reuse and render.exists()):
            run(["npx", "remotion", "render", "PinkEdit", render, f"--props={file}",
                 f"--frames={first}-{last - 1}", "--codec=h264", "--audio-codec=aac", "--crf=18",
                 "--timeout=120000", "--concurrency=3", "--log=error"])
        gain = voice_gain(render)
        # Liviano y sin metadatos: se sirve desde la web.
        run(["ffmpeg", "-v", "error", "-y", "-i", render, "-vf", "scale=540:960",
             "-af", f"volume={gain:.2f}dB", "-c:v", "libx264", "-preset", "slow",
             "-crf", "28", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
             "-map_metadata", "-1", "-movflags", "+faststart", OUTPUT / f"{name}.mp4"])
        run(["ffmpeg", "-v", "error", "-y", "-ss", cover, "-i",
             OUTPUT / f"{name}.mp4", "-frames:v", "1", "-q:v", "4", OUTPUT / f"{name}.jpg"])
        print(f"{name}: {(OUTPUT / f'{name}.mp4').stat().st_size // 1024} KB, voz {gain:+.1f} dB", flush=True)


if __name__ == "__main__":
    main()
