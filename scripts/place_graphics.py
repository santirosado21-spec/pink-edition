"""Coloca cada tarjeta por encima de la persona, con aire entre ambas."""

import argparse
import json
import re
import subprocess
from pathlib import Path

import numpy as np

PROJECT = Path(__file__).resolve().parents[1]
PERSON = PROJECT / "public/client/pool-person.webm"
SMALL = (120, 212)


def person_alpha():
    """Canal alfa del recorte, reducido: basta para saber dónde está el cuerpo."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-i", str(PERSON), "-vf",
         f"alphaextract,scale={SMALL[0]}:{SMALL[1]}", "-f", "rawvideo",
         "-pix_fmt", "gray", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, SMALL[1], SMALL[0])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gap", type=int, default=70,
                        help="Píxeles libres entre la tarjeta y la persona.")
    parser.add_argument("--minimum-top", type=int, default=150)
    args = parser.parse_args()
    path = PROJECT / "full-demo-config.json"
    text = path.read_text(encoding="utf-8")
    config = json.loads(text)
    plan = json.loads((PROJECT / "src/pool-full-timeline.json").read_text())
    style = config["graphics"]
    alpha = person_alpha()
    # El video cubre el lienzo: misma escala en ambos ejes, centrado.
    scale = max(config["width"] / 480, config["height"] / 848)
    offset_y = (848 * scale - config["height"]) / 2
    offset_x = (480 * scale - config["width"]) / 2
    unit = 848 / SMALL[1]
    columns = slice(int((style["left"] + offset_x) / scale / unit),
                    int((style["left"] + style["width"] + offset_x) / scale / unit) + 1)
    words = {word["id"]: clip["timeline_in_frame"] + word["source_start_frame"]
             - clip["source_in_frame"] for clip in plan["clips"] for word in clip["words"]}

    def source_frame(frame):
        for clip in plan["clips"]:
            if clip["timeline_in_frame"] <= frame < clip["timeline_out_frame"]:
                return frame - clip["timeline_in_frame"] + clip["source_in_frame"]
        return None

    for event in style["events"]:
        start = words[event["anchor_word_id"]] + event["offset_frames"]
        highest = config["height"]
        for frame in range(start, start + event["duration_frames"]):
            source = source_frame(frame)
            if source is None or source >= len(alpha):
                continue
            rows = np.where((alpha[source][:, columns] > 96).any(axis=1))[0]
            if len(rows):
                highest = min(highest, rows[0] * unit * scale - offset_y)
        top = int(highest - args.gap - style["height"])
        if top < args.minimum_top:
            print(f"{event['id']}: sólo caben {int(highest - args.minimum_top - style['height'])} px de aire")
            top = args.minimum_top
        pattern = rf'("id": "{event["id"]}", "kind"[^\n]*?"top": )-?\d+'
        text, count = re.subn(pattern, rf"\g<1>{top}", text)
        if count != 1:
            raise SystemExit(f"No se encontró el campo top de {event['id']}.")
        print(f"{event['id']}: persona desde y={int(highest)}, tarjeta en y={top}–{top + style['height']}")
    path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
