"""Extrae frames clave para revisar la imagen; no sustituye la aprobación humana."""

import argparse
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PROJECT = Path(__file__).resolve().parents[1]
STYLE = PROJECT / "style/pink-demo-v1.json"
PLAN = PROJECT / "projects/piscina/plan.json"
TIMELINE = PROJECT / "src/pool-full-timeline.json"
COMPOSITION = "PinkEdit"
THUMB = (360, 640)
COLUMNS, ROWS = 6, 2


def run(arguments):
    return subprocess.run(arguments, check=True, text=True, capture_output=True,
                          cwd=PROJECT)


def word_frames(plan):
    """Misma regla que src/edit.ts: frame de la palabra en el montaje."""
    return {word["id"]: clip["timeline_in_frame"] + word["source_start_frame"]
            - clip["source_in_frame"]
            for clip in plan["clips"] for word in clip["words"]}


def resolve(event, plan, frames):
    if plan.get("is_sample"):
        return event.get("sample_frame", 0)
    return frames[event["anchor_word_id"]] + event["offset_frames"]


def key_frames(timeline, style, plan):
    """Una muestra por subtítulo y fondo; tres por tarjeta."""
    frames = word_frames(timeline)
    reveal = style["captions"]["reveal_frames"]
    graphics = style["graphics"]
    cards = [(resolve(event, timeline, frames), event) for event in plan["cards"]]
    chosen = {}
    for clip in timeline["clips"]:
        shift = clip["timeline_in_frame"] - clip["source_in_frame"]
        for page in clip["pages"]:
            words = [word for line in page["lines"] for word in line]
            source = min(words[-1]["source_start_frame"] + reveal,
                         page["end_frame"] - 1)
            chosen[source + shift] = {
                "kind": "caption", "clip": clip["id"],
                "lines": [" ".join(w["text"] for w in line) for line in page["lines"]]}
    for start, event in cards:
        last = start + event["duration_frames"]
        for name, frame in [("card_enter", start + graphics["enter_frames"] // 2),
                            ("card_hold", start + event["duration_frames"] // 2),
                            ("card_exit", last - graphics["exit_frames"] - 1)]:
            chosen.setdefault(frame, {})["kind"] = name
    for event in plan["backgrounds"]:
        start = resolve(event, timeline, frames)
        chosen.setdefault(start + event["duration_frames"] // 2,
                          {"kind": "background_hold"})
    items = []
    for frame in sorted(chosen):
        item = {"frame": frame, **chosen[frame]}
        item["cards"] = [event["id"] for start, event in cards
                         if start <= frame < start + event["duration_frames"]]
        if "lines" not in item:
            item["lines"] = caption_at(timeline, frame)
        items.append(item)
    return items


def caption_at(plan, frame):
    for clip in plan["clips"]:
        source = frame - clip["timeline_in_frame"] + clip["source_in_frame"]
        if clip["timeline_in_frame"] <= frame < clip["timeline_out_frame"]:
            for page in clip["pages"]:
                if page["start_frame"] <= source < page["end_frame"]:
                    return [" ".join(w["text"] for w in line)
                            for line in page["lines"]]
    return []


def caption_warnings(timeline, style):
    """Avisa de palabras que casi no se ven y de renglones de una palabra corta."""
    warnings = []
    minimum_frames = style["captions"]["min_last_word_frames"]
    for clip in timeline["clips"]:
        shift = clip["timeline_in_frame"] - clip["source_in_frame"]
        for page in clip["pages"]:
            text = " / ".join(" ".join(w["text"] for w in line)
                              for line in page["lines"])
            for word in (w for line in page["lines"] for w in line):
                visible = page["end_frame"] - word["source_start_frame"]
                if visible < minimum_frames:
                    warnings.append({
                        "kind": "word_barely_visible", "word_id": word["id"],
                        "text": word["text"], "visible_frames": visible,
                        "frame": word["source_start_frame"] + shift, "page": text})
            last = page["lines"][-1]
            if len(page["lines"]) > 1 and len(last) == 1 and len(last[0]["text"]) <= 5:
                warnings.append({"kind": "orphan_line", "text": last[0]["text"],
                                 "frame": page["start_frame"] + shift, "page": text})
    return warnings


def contact_sheets(entries, folder, prefix):
    """Hojas de doce miniaturas, legibles sin reducir por debajo de 360px."""
    face = ImageFont.truetype(str(PROJECT / "public/InterDisplay-Bold.ttf"), 26)
    label_height, sheets = 44, []
    for number, first in enumerate(range(0, len(entries), COLUMNS * ROWS), 1):
        group = entries[first:first + COLUMNS * ROWS]
        rows = -(-len(group) // COLUMNS)
        sheet = Image.new("RGB", (COLUMNS * THUMB[0],
                                  rows * (THUMB[1] + label_height)), "#141212")
        draw = ImageDraw.Draw(sheet)
        for index, (label, path) in enumerate(group):
            x = index % COLUMNS * THUMB[0]
            y = index // COLUMNS * (THUMB[1] + label_height)
            with Image.open(path) as image:
                sheet.paste(image.convert("RGB").resize(THUMB), (x, y + label_height))
            draw.text((x + 10, y + 8), label, font=face, fill="#ffffff")
        target = folder / f"{prefix}-{number:02}.jpg"
        sheet.save(target, quality=90)
        sheets.append(target.name)
    return sheets


def extract_reference(video, frame_numbers, folder, size):
    """Lee frames exactos de un video de referencia a la resolución de entrega."""
    folder.mkdir(parents=True, exist_ok=True)
    rate = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=r_frame_rate", "-of",
                "default=nw=1:nk=1", str(video)]).stdout.strip().split("/")
    fps = float(rate[0]) / float(rate[1])
    paths = {}
    for frame in frame_numbers:
        target = folder / f"ref-{frame:05}.png"
        # Medio frame antes: el primero que se decodifica es el pedido.
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0, frame - 0.5) / fps:.6f}",
             "-i", str(video), "-vf", f"scale={size[0]}:{size[1]}",
             "-frames:v", "1", str(target)])
        paths[frame] = target
    return paths


def side_by_side(ours, reference, target):
    with Image.open(ours) as left, Image.open(reference) as right:
        pair = Image.new("RGB", (left.width + right.width, left.height))
        pair.paste(left.convert("RGB"), (0, 0))
        pair.paste(right.convert("RGB").resize(left.size), (left.width, 0))
        pair.save(target, quality=92)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=PROJECT / "out/review")
    parser.add_argument("--concurrency", type=int, default=3)
    parser.add_argument("--style", type=Path, default=STYLE)
    parser.add_argument("--plan", type=Path, default=PLAN)
    parser.add_argument("--timeline", type=Path, default=TIMELINE)
    parser.add_argument("--composition", default=COMPOSITION)
    parser.add_argument("--props", type=Path)
    parser.add_argument("--reference", type=Path,
                        help="Video de referencia para extraer frames.")
    parser.add_argument("--reference-frames", default="",
                        help="Frames de la referencia separados por comas.")
    parser.add_argument("--pairs", default="",
                        help="Pares nuestro:referencia, por ejemplo 420:60,760:1080.")
    args = parser.parse_args()
    out = args.out.resolve()
    (out / "frames").mkdir(parents=True, exist_ok=True)
    style = json.loads(args.style.read_text(encoding="utf-8"))
    plan = json.loads(args.plan.read_text(encoding="utf-8"))
    timeline = json.loads(args.timeline.read_text(encoding="utf-8"))
    items = key_frames(timeline, style, plan)

    print(f"Preparando {len(items)} frames de {args.composition}.", flush=True)
    run(["npx", "remotion", "bundle", "--out-dir", str(out / "bundle")])

    def still(item):
        target = out / "frames" / f"f{item['frame']:05}.png"
        command = ["npx", "remotion", "still", str(out / "bundle"), args.composition,
                   str(target), f"--frame={item['frame']}"]
        if args.props:
            command.append(f"--props={args.props}")
        try:
            run(command)
        except subprocess.CalledProcessError:
            # Los navegadores en paralelo fallan a veces al arrancar; un reintento.
            run(command)
        item["file"] = f"frames/{target.name}"
        return target

    with ThreadPoolExecutor(args.concurrency) as pool:
        paths = list(pool.map(still, items))
    sheets = contact_sheets(
        [(f"{item['frame']} {item['kind'].replace('card_', '')}", path)
         for item, path in zip(items, paths)], out, "sheet")
    manifest = {"composition": args.composition, "is_sample": bool(timeline.get("is_sample")),
                "frames": items, "sheets": sheets,
                "warnings": caption_warnings(timeline, style)}

    if args.reference:
        pairs = [tuple(int(v) for v in pair.split(":"))
                 for pair in args.pairs.split(",") if pair]
        wanted = sorted({int(v) for v in args.reference_frames.split(",") if v}
                        | {reference for _, reference in pairs})
        size = (style["width"], style["height"])
        references = extract_reference(args.reference.resolve(), wanted,
                                       out / "reference", size)
        manifest["reference_sheets"] = contact_sheets(
            [(f"ref {frame}", path) for frame, path in references.items()],
            out, "reference-sheet")
        manifest["pairs"] = []
        for ours, reference in pairs:
            target = out / f"pair-{ours:05}-ref-{reference:05}.jpg"
            side_by_side(out / "frames" / f"f{ours:05}.png", references[reference],
                         target)
            manifest["pairs"].append({"frame": ours, "reference_frame": reference,
                                      "file": target.name})

    (out / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Listo: {len(items)} frames, {len(sheets)} hojas y "
          f"{len(manifest['warnings'])} avisos en {out}", flush=True)


if __name__ == "__main__":
    main()
