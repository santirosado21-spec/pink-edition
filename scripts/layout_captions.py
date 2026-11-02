"""Recompone páginas con la fuente elegida sin cambiar texto, cortes ni tiempos."""
import argparse
import json
import math
from pathlib import Path
from prepare_full_demo import caption_face, caption_pages

ROOT = Path(__file__).resolve().parents[1]

def font_style(style, preferences):
    catalog = json.loads((ROOT / "style/catalog-v1.json").read_text())
    font = next(item for item in catalog["fonts"] if item["id"] == preferences.get("font", "inter"))
    style["captions"].update(font_family=font["family"], font_file=font["file"], letter_spacing_em=font["tracking"], font_size=font["size"], line_height=math.ceil(font["size"] * 1.12))
    return style

def repaginate(timeline_path, plan_path, style_path):
    timeline = json.loads(timeline_path.read_text())
    plan = json.loads(plan_path.read_text())
    style = font_style(json.loads(style_path.read_text()), plan.get("preferences", {}))
    font = style["captions"]["font_file"]
    if timeline.get("caption_layout") == style["captions"]:
        return
    face = caption_face(style)
    for clip in timeline["clips"]:
        clip["pages"] = caption_pages(clip["words"], face, style["captions"], clip["source_in_frame"] + clip["duration_frames"])
    timeline["caption_font"] = font
    timeline["caption_layout"] = style["captions"]
    temporary = timeline_path.with_suffix(".layout.tmp")
    temporary.write_text(json.dumps(timeline, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(timeline_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeline", type=Path, required=True)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--style", type=Path, default=ROOT / "style/pink-demo-v1.json")
    args = parser.parse_args()
    repaginate(args.timeline, args.plan, args.style)
