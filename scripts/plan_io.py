"""Lee y escribe el plan de edición con un evento por renglón."""

import json
import re
from pathlib import Path


PREFERENCES = {"vibe": ("clean", "balanced", "dynamic"), "graphics": ("many", "few", "none"),
               "sfx": ("full", "soft", "none")}
TEXTS = {"topic": 80, "notes": 300}
CAPTION_PRESETS = ("pink", "keyword", "karaoke")
MAX_EMPHASIS = 40


def check_preferences(prefs):
    """Mismas reglas que `checkPreferences` en src/preferences.ts."""
    if not isinstance(prefs, dict):
        return ["Las preferencias no son válidas."]
    expected = {*PREFERENCES, *TEXTS, "brand_color", "context_colors"}
    # «captions» es opcional: los perfiles anteriores no lo tienen.
    errors = [f"Preferencia desconocida o ausente: {name}." for name in sorted((set(prefs) - {"captions"}) ^ expected)]
    if "captions" in prefs and prefs["captions"] not in CAPTION_PRESETS:
        errors.append("captions: valor desconocido.")
    errors += [f"{name}: valor desconocido." for name, values in PREFERENCES.items()
               if prefs.get(name) not in values]
    errors += [f"{name}: texto demasiado largo." for name, limit in TEXTS.items()
               if not isinstance(prefs.get(name), str) or len(prefs[name]) > limit]
    if not isinstance(prefs.get("brand_color"), str) or not re.fullmatch(
            r"#[0-9a-fA-F]{6}", prefs["brand_color"]):
        errors.append("brand_color: debe ser un hexadecimal como #1f5fc4.")
    if not isinstance(prefs.get("context_colors"), bool):
        errors.append("context_colors: debe ser verdadero o falso.")
    return errors


def empty_plan(style_id, preferences=None):
    """Plan sin decisiones: sólo captions y sonidos de corte de toma.

    Lleva copiados los gustos del creador (cuestionario de estilo), si los hay.
    """
    plan = {"style": style_id, "version": 1, "cuts": [], "cards": [], "backgrounds": []}
    if preferences:
        plan["preferences"] = preferences
    return plan


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
    if "preferences" in plan and check_preferences(plan["preferences"]):
        return check_preferences(plan["preferences"])
    if len(events) > MAX_EVENTS or any(not isinstance(event, dict) for event in events):
        return [f"El plan tiene elementos inválidos o más de {MAX_EVENTS}."]
    errors = []
    emphasis = plan.get("emphasis_word_ids")
    if emphasis is not None:
        if (not isinstance(emphasis, list) or len(emphasis) > MAX_EMPHASIS
                or len(set(map(str, emphasis))) != len(emphasis)):
            errors.append(f"emphasis_word_ids: lista sin repetidos de hasta {MAX_EMPHASIS}.")
        elif any(word not in frames for word in emphasis):
            errors.append("emphasis_word_ids: una palabra no existe en el video.")
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
