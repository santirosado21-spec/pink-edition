"""Lee y escribe el plan de edición con un evento por renglón."""

import json
import re
from pathlib import Path


def empty_plan(style_id):
    """Plan sin decisiones: sólo captions y sonidos de corte de toma."""
    return {"style": style_id, "version": 1, "cuts": [], "cards": [],
            "backgrounds": []}


MAX_EVENTS = 60


def check_plan(plan, timeline):
    """Cotas mínimas de un plan que llega de fuera, antes de gastar cómputo en él.

    La web valida más (`validatePlan`); esto protege al procesador de un plan
    insertado directamente en la base.
    """
    total = timeline["duration_frames"]
    frames = {word["id"]: clip["timeline_in_frame"] + word["source_start_frame"]
              - clip["source_in_frame"] for clip in timeline["clips"] for word in clip["words"]}
    groups = [plan.get(name) if isinstance(plan, dict) else None
              for name in ("cuts", "cards", "backgrounds")]
    if any(not isinstance(group, list) for group in groups):
        return ["El plan no tiene las listas cuts, cards y backgrounds."]
    events = [event for group in groups for event in group]
    if len(events) > MAX_EVENTS or any(not isinstance(event, dict) for event in events):
        return [f"El plan tiene elementos inválidos o más de {MAX_EVENTS}."]
    errors = []
    for event in events:
        name = event.get("id")
        duration, offset = event.get("duration_frames"), event.get("offset_frames")
        anchor = frames.get(event.get("anchor_word_id"))
        if anchor is None:
            errors.append(f"{name}: la palabra de anclaje no existe.")
        elif (type(duration) is not int or type(offset) is not int
              or not 1 <= duration <= total or not 0 <= anchor + offset < total):
            errors.append(f"{name}: duración o posición fuera del video.")
    return errors


def load_plan(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def save_plan(path, plan):
    """Un evento por renglón para que los cambios del plan se lean en un diff."""
    text = json.dumps(plan, ensure_ascii=False, indent=2)
    text = re.sub(r"\{\n\s+\"anchor_word_id\": [^{}]*?\n\s+\}",
                  lambda match: re.sub(r"\n\s+", " ", match.group(0))
                  .replace("{ ", "{").replace(" }", "}"), text)
    text = re.sub(r"\{\n\s+\"id\": [^{}]*?(\{[^{}]*\}[^{}]*?)?\n\s+\}(?=,?\n)",
                  lambda match: re.sub(r"\n\s+", " ", match.group(0))
                  .replace("{ ", "{").replace(" }", "}"), text)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(text + "\n", encoding="utf-8")
