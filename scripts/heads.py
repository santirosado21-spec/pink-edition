"""Caja de la cabeza en cada toma, para encuadrar zooms y transiciones sin cortar la cara.

Mide sobre el recorte de la persona sólo la parte visible en el lienzo (el video se
recorta tipo «cover»). La caja de una toma es la unión de todos sus cuadros muestreados,
así que también cubre el movimiento. Las cabezas ya guardadas (`--previous`) se reutilizan
tal cual cuando la toma no cambió: volver a correr el pipeline no las altera.
"""

import argparse
import json
from pathlib import Path

import numpy as np

from place_graphics import SMALL_HEIGHT, person_alpha, probe_size
from plan_io import head_key

PROJECT = Path(__file__).resolve().parents[1]
STEP = 3
BAND = 0.14
THRESHOLD = 96


def measure(clip, alpha, geometry):
    """Unión de las cajas de cabeza de la toma, en píxeles del lienzo; None sin persona."""
    width, height, scale, offset_x, offset_y, unit = geometry
    # Región visible del lienzo, en filas y columnas del alfa reducido.
    rows = slice(max(0, int(offset_y / scale / unit)), int((offset_y + height) / scale / unit) + 1)
    columns = slice(max(0, int(offset_x / scale / unit)), int((offset_x + width) / scale / unit) + 1)
    band = max(1, int(BAND * height / scale / unit))
    box = None
    for source in range(clip["source_in_frame"], clip["source_in_frame"] + clip["duration_frames"], STEP):
        if source >= len(alpha):
            break
        visible = alpha[source][rows, columns] > THRESHOLD
        filled = np.where(visible.any(axis=1))[0]
        if not len(filled):
            continue
        top = filled[0]
        cols = np.where(visible[top:top + band].any(axis=0))[0]
        # De filas y columnas visibles a píxeles del lienzo.
        y0 = (rows.start + top) * unit * scale - offset_y
        x0 = (columns.start + cols[0]) * unit * scale - offset_x
        x1 = (columns.start + cols[-1] + 1) * unit * scale - offset_x
        frame_box = [y0, y0 + BAND * height, x0, x1]
        box = frame_box if box is None else [min(box[0], frame_box[0]), max(box[1], frame_box[1]),
                                             min(box[2], frame_box[2]), max(box[3], frame_box[3])]
    if box is None:
        return None
    top, bottom, left, right = box
    clamp = lambda value, limit: float(round(min(limit, max(0.0, value)), 1))
    return {"top": clamp(top, height), "bottom": clamp(bottom, height),
            "left": clamp(left, width), "right": clamp(right, width)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeline", type=Path, required=True)
    parser.add_argument("--person", type=Path, required=True)
    parser.add_argument("--style", type=Path, default=PROJECT / "style/pink-demo-v1.json")
    parser.add_argument("--previous", type=Path, help="Cabezas guardadas antes del corte.")
    args = parser.parse_args()
    style = json.loads(args.style.read_text(encoding="utf-8"))
    timeline = json.loads(args.timeline.read_text(encoding="utf-8"))
    previous = (json.loads(args.previous.read_text(encoding="utf-8"))
                if args.previous and args.previous.exists() else {})
    missing = [clip for clip in timeline["clips"] if head_key(clip) not in previous]
    if missing:
        source_width, source_height = probe_size(args.person)
        small = (max(2, round(source_width * SMALL_HEIGHT / source_height)), SMALL_HEIGHT)
        alpha = person_alpha(args.person, small)
        scale = max(style["width"] / source_width, style["height"] / source_height)
        geometry = (style["width"], style["height"], scale,
                    (source_width * scale - style["width"]) / 2,
                    (source_height * scale - style["height"]) / 2,
                    source_height / small[1])
    for clip in timeline["clips"]:
        key = head_key(clip)
        clip["head"] = previous[key] if key in previous else measure(clip, alpha, geometry)
    args.timeline.write_text(json.dumps(timeline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    reused = len(timeline["clips"]) - len(missing)
    print(f"Cabezas: {len(missing)} medidas, {reused} reutilizadas.", flush=True)


if __name__ == "__main__":
    main()
