"""Coloca cada tarjeta por encima de la persona, con aire entre ambas."""

import argparse
import json
import subprocess
from pathlib import Path

import numpy as np

from plan_io import load_plan, save_plan

PROJECT = Path(__file__).resolve().parents[1]
SMALL_HEIGHT = 212


def probe_size(path):
    values = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height", "-of", "csv=p=0", str(path)],
        check=True, text=True, capture_output=True).stdout.strip().split(",")
    return int(values[0]), int(values[1])


def person_alpha(path, small):
    """Canal alfa del recorte, reducido: basta para saber dónde está el cuerpo."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-i", str(path), "-vf",
         f"alphaextract,scale={small[0]}:{small[1]}", "-f", "rawvideo",
         "-pix_fmt", "gray", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, small[1], small[0])


def place(highest, style):
    """Posición y capa de una tarjeta según dónde empieza la persona (y en el lienzo).

    Normalmente va detrás de la persona, por encima de la cabeza. Si no cabe, va al
    frente a la altura del pecho, siempre que quede debajo del rostro y encima de los
    captions. Si tampoco cabe ahí, queda arriba y se avisa (capa None).
    """
    card = style["graphics"]
    top = int(highest - card["gap_above_person"] - card["height"])
    if top >= card["minimum_top"]:
        return top, "behind"
    front = int(style["captions"]["top"] - card["gap_above_captions"] - card["height"])
    if front >= highest + card["face_height"]:
        return front, "front"
    return card["minimum_top"], None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--style", type=Path, default=PROJECT / "style/pink-demo-v1.json")
    parser.add_argument("--plan", type=Path, default=PROJECT / "projects/piscina/plan.json")
    parser.add_argument("--timeline", type=Path, default=PROJECT / "src/pool-full-timeline.json")
    parser.add_argument("--person", type=Path,
                        default=PROJECT / "public/client/pool-person.webm")
    args = parser.parse_args()
    style = json.loads(args.style.read_text(encoding="utf-8"))
    timeline = json.loads(args.timeline.read_text(encoding="utf-8"))
    plan = load_plan(args.plan)
    card = style["graphics"]
    source_width, source_height = probe_size(args.person)
    small = (max(2, round(source_width * SMALL_HEIGHT / source_height)), SMALL_HEIGHT)
    alpha = person_alpha(args.person, small)
    # El video cubre el lienzo: misma escala en ambos ejes, centrado.
    scale = max(style["width"] / source_width, style["height"] / source_height)
    offset_y = (source_height * scale - style["height"]) / 2
    offset_x = (source_width * scale - style["width"]) / 2
    unit = source_height / small[1]
    columns = slice(max(0, int((card["left"] + offset_x) / scale / unit)),
                    int((card["left"] + card["width"] + offset_x) / scale / unit) + 1)
    words = {word["id"]: clip["timeline_in_frame"] + word["source_start_frame"]
             - clip["source_in_frame"] for clip in timeline["clips"] for word in clip["words"]}

    def source_frame(frame):
        for clip in timeline["clips"]:
            if clip["timeline_in_frame"] <= frame < clip["timeline_out_frame"]:
                return frame - clip["timeline_in_frame"] + clip["source_in_frame"]
        return None

    for event in plan["cards"]:
        start = words[event["anchor_word_id"]] + event["offset_frames"]
        highest = style["height"]
        for frame in range(start, start + event["duration_frames"]):
            source = source_frame(frame)
            if source is None or source >= len(alpha):
                continue
            rows = np.where((alpha[source][:, columns] > 96).any(axis=1))[0]
            if len(rows):
                highest = min(highest, rows[0] * unit * scale - offset_y)
        top, layer = place(highest, style)
        event["top"] = top
        event.pop("layer", None)
        if layer == "front":
            event["layer"] = "front"
            print(f"RESPALDO {event['id']}: no cabe sobre la persona; va al frente, "
                  f"entre el rostro y los captions (y={top}–{top + card['height']}).")
        elif layer is None:
            # Sin sitio arriba ni en el pecho: avisar, no ocultarlo.
            print(f"AVISO {event['id']}: no cabe sobre la persona ni delante de ella sin "
                  "tapar el rostro o los captions; quedará parcialmente tapada.")
        print(f"{event['id']}: persona desde y={int(highest)}, "
              f"tarjeta en y={top}–{top + card['height']}")
    save_plan(args.plan, plan)


if __name__ == "__main__":
    main()
