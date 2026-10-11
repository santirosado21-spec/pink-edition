"""Stills de revisión con un video sintético: sin material del cliente, GPU ni transcripción.

Genera una figura de persona que ocupa casi todo el alto (fuerza el respaldo de las
tarjetas al frente), un plan con los temas `money` y `tech`, coloca las tarjetas con
place_graphics.py y renderiza frames de PinkEdit con Remotion. Sólo es QC técnico:
la aprobación estética se hace con video real.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
JOB = "qa-synthetic"
PERSON = "lt(hypot(X-540\\,Y-430)\\,240)+gt(Y\\,660)*lt(abs(X-540)\\,400)"
TEXT = "si ahorras el 30 por ciento cada mes tu dinero crece y la tecnología hace el resto por ti"
# Frame de cada momento: tarjeta al frente con fondo, corte sólido y corte de papel.
FRAMES = {"card": 55, "cut-solid": 95, "cut-paper": 140}


def ffmpeg(*arguments):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *arguments], check=True)


def media(folder):
    canvas = ["-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=30:d=6"]
    ffmpeg(*canvas, "-f", "lavfi", "-i", "sine=f=220:d=6:sample_rate=48000", "-vf",
           f"format=rgb24,geq=r='if(gt({PERSON}\\,0)\\,205\\,30+Y/24)':g='if(gt({PERSON}\\,0)\\,150\\,80+X/30)'"
           f":b='if(gt({PERSON}\\,0)\\,120\\,110+Y/30)'",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-c:a", "aac", "-shortest", str(folder / "source.mp4"))
    ffmpeg(*canvas, "-vf",
           f"format=rgb24,geq=r='if(gt({PERSON}\\,0)\\,205\\,0)':g='if(gt({PERSON}\\,0)\\,150\\,0)':b='if(gt({PERSON}\\,0)\\,120\\,0)',"
           f"format=yuva420p,geq=lum='p(X\\,Y)':cb='p(X\\,Y)':cr='p(X\\,Y)':a='if(gt({PERSON}\\,0)\\,255\\,0)'",
           "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-b:v", "1M", str(folder / "person.webm"))


def timeline_and_plan():
    words = [{"id": f"qa.word.{i}", "text": text, "source_start_frame": i * 10, "source_end_frame": i * 10 + 9,
              "alignment_score": None} for i, text in enumerate(TEXT.split())]
    pages = [{"start_frame": i * 10, "end_frame": min(180, i * 10 + 40), "lines": [words[i:i + 4]]}
             for i in range(0, len(words), 4)]
    timeline = {"fps": 30, "duration_frames": 180, "clips": [{
        "id": "c0", "source_in_frame": 0, "source_out_frame": 180, "duration_frames": 180, "timeline_in_frame": 0,
        "timeline_out_frame": 180, "words": words, "pages": pages}]}
    word = lambda index: f"qa.word.{index}"
    plan = {"style": "pink-demo-v1", "version": 1, "music": None, "cuts": [
        {"id": "cut_1", "label": "tu dinero crece", "theme": "money", "style": "solid", "anchor_word_id": word(8),
         "offset_frames": 0, "duration_frames": 30, "last_word_id": word(10)},
        {"id": "cut_2", "label": "la tecnología hace el resto", "theme": "tech", "style": "paper", "anchor_word_id": word(12),
         "offset_frames": 0, "duration_frames": 40, "last_word_id": word(15)}],
        "cards": [{"id": "card_1", "label": "30 por ciento", "theme": "money", "kind": "counter", "text": "30%",
                   "anchor_word_id": word(2), "offset_frames": 0, "duration_frames": 60,
                   "beat": {"anchor_word_id": word(3), "offset_frames": 0}, "meaning": "cifra dicha"}],
        "backgrounds": [{"id": "background_1", "label": "ahorro", "theme": "tech", "motif": "network",
                         "anchor_word_id": word(2), "offset_frames": 0, "duration_frames": 60}]}
    return timeline, plan


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=PROJECT / "work" / JOB / "stills")
    parser.add_argument("--browser", help="Chromium para Remotion, si no usa el suyo.")
    args = parser.parse_args()
    work, public = PROJECT / "work" / JOB, PROJECT / "public/work" / JOB
    for folder in (work, public, args.out):
        folder.mkdir(parents=True, exist_ok=True)
    media(public)
    timeline, plan = timeline_and_plan()
    (work / "timeline.json").write_text(json.dumps(timeline))
    (work / "plan.json").write_text(json.dumps(plan))
    subprocess.run([sys.executable, str(PROJECT / "scripts/place_graphics.py"), "--plan", str(work / "plan.json"),
                    "--timeline", str(work / "timeline.json"), "--person", str(public / "person.webm")], check=True)
    style = json.loads((PROJECT / "style/pink-demo-v1.json").read_text())
    props = {"style": style, "plan": json.loads((work / "plan.json").read_text()), "timeline": timeline,
             "media": {"source": f"work/{JOB}/source.mp4", "person": f"work/{JOB}/person.webm"}}
    (work / "props.json").write_text(json.dumps(props, ensure_ascii=False))
    browser = [f"--browser-executable={args.browser}"] if args.browser else []
    for name, frame in FRAMES.items():
        subprocess.run(["npx", "remotion", "still", "src/index.ts", "PinkEdit", str(args.out / f"{name}.png"),
                        f"--props={work / 'props.json'}", f"--frame={frame}", "--log=error", *browser],
                       check=True, cwd=PROJECT)
    print(f"Stills en {args.out}")


if __name__ == "__main__":
    main()
