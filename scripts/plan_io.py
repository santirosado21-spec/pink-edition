"""Lee y escribe el plan de edición con un evento por renglón."""

import json
import re
from pathlib import Path


PREFERENCES = {"vibe": ("clean", "balanced", "dynamic"), "graphics": ("many", "few", "none"),
               "sfx": ("full", "soft", "none")}
TEXTS = {"topic": 80, "notes": 300}
CAPTION_PRESETS = ("pink", "keyword", "karaoke")
# Mismos valores que src/zooms.ts.
ZOOM_MIN, ZOOM_MAX = 1.05, 1.35
TAKE_TRANSITIONS = ("none", "punch", "flash")
MAX_EMPHASIS = 40
CATALOG = json.loads((Path(__file__).resolve().parents[1] / "style/catalog-v1.json").read_text())
OPTIONAL = {"captions", "catalog_version", "brand_name", "vocabulary", "font", "graphic_material", "graphic_kinds", "transition", "sound_pack", "language", "support_media", "emphasis_mode", "editorialFamilyId"}


def utf16_length(text):
    """La web limita unidades UTF-16, no puntos de código Unicode."""
    return len(text.encode("utf-16-le", errors="surrogatepass")) // 2


def check_preferences(prefs):
    """Mismas reglas que `checkPreferences` en src/preferences.ts."""
    if not isinstance(prefs, dict):
        return ["Las preferencias no son válidas."]
    expected = {*PREFERENCES, *TEXTS, "brand_color", "context_colors"}
    # «captions» es opcional: los perfiles anteriores no lo tienen.
    errors = [f"Preferencia desconocida o ausente: {name}." for name in sorted((set(prefs) - OPTIONAL) ^ expected)]
    if "catalog_version" in prefs and (type(prefs["catalog_version"]) not in (int, float) or prefs["catalog_version"] != 1):
        errors.append("Versión de catálogo desconocida.")
    if "brand_name" in prefs and (not isinstance(prefs["brand_name"], str) or utf16_length(prefs["brand_name"]) > 80):
        errors.append("Nombre de marca inválido.")
    if "vocabulary" in prefs and (not isinstance(prefs["vocabulary"], str) or utf16_length(prefs["vocabulary"]) > 300):
        errors.append("Vocabulario inválido.")
    for key, group in [("font", "fonts"), ("graphic_material", "materials"), ("transition", "transitions"), ("sound_pack", "sounds")]:
        if key in prefs and prefs[key] not in [item["id"] for item in CATALOG[group]]:
            errors.append(f"{key}: opción desconocida.")
    for key, values in {'support_media': ['auto', 'video', 'still', 'none'], 'emphasis_mode': ['overlay', 'fullscreen', 'none'], 'editorialFamilyId': ['umbral', 'bitacora', 'estampa', 'pulso', 'enlace']}.items():
        if key in prefs and prefs[key] not in values:
            errors.append(f'{key}: opción desconocida.')
    if "language" in prefs and prefs["language"] not in ("es", "en", "mixed"):
        errors.append("Idioma desconocido.")
    if "graphic_kinds" in prefs:
        kinds = prefs["graphic_kinds"]
        if (not isinstance(kinds, list) or any(not isinstance(k, str) or k not in [i["id"] for i in CATALOG["graphics"]] for k in kinds)
                or len(kinds) > len(CATALOG["graphics"]) or len(kinds) != len(set(kinds))):
            errors.append("Selección de gráficos inválida.")
    if "captions" in prefs and prefs["captions"] not in CAPTION_PRESETS:
        errors.append("captions: valor desconocido.")
    errors += [f"{name}: valor desconocido." for name, values in PREFERENCES.items()
               if prefs.get(name) not in values]
    errors += [f"{name}: texto demasiado largo." for name, limit in TEXTS.items()
               if not isinstance(prefs.get(name), str) or utf16_length(prefs[name]) > limit]
    if not isinstance(prefs.get("brand_color"), str) or not re.fullmatch(
            r"#[0-9a-fA-F]{6}", prefs["brand_color"]):
        errors.append("brand_color: debe ser un hexadecimal como #1f5fc4.")
    if not isinstance(prefs.get("context_colors"), bool):
        errors.append("context_colors: debe ser verdadero o falso.")
    return errors


def require_preferences(value):
    problems = check_preferences(value)
    if problems:
        raise ValueError("Tu estilo guardado necesita revisión: " + " ".join(problems[:3]))
    return value


def read_preferences_file(path, *, optional=False):
    try:
        text = Path(path).read_text(encoding="utf-8")
    except FileNotFoundError:
        if optional:
            return None
        raise ValueError("No se encontró el archivo de preferencias solicitado.") from None
    try:
        value = json.loads(text)
    except (ValueError, TypeError):
        raise ValueError("Tu estilo guardado necesita revisión: el archivo no contiene JSON válido.") from None
    return require_preferences(value)


def empty_plan(style_id, preferences=None):
    """Plan sin decisiones: sólo captions y sonidos de corte de toma.

    Lleva copiados los gustos del creador (cuestionario de estilo), si los hay.
    """
    plan = {"style": style_id, "version": 1, "cuts": [], "cards": [], "backgrounds": []}
    if preferences is not None:
        require_preferences(preferences)
        plan["preferences"] = preferences
        plan["take_transition"] = preferences.get("transition", "none")
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
    if isinstance(plan, dict) and "zooms" in plan:
        groups.append(plan["zooms"])
    if any(not isinstance(group, list) for group in groups):
        return ["El plan no tiene las listas cuts, cards y backgrounds."]
    events = [event for group in groups for event in group]
    if "preferences" in plan and check_preferences(plan["preferences"]):
        return check_preferences(plan["preferences"])
    if len(events) > MAX_EVENTS or any(not isinstance(event, dict) for event in events):
        return [f"El plan tiene elementos inválidos o más de {MAX_EVENTS}."]
    errors = []
    seen = set()
    for event in events:
        identifier = event.get("id")
        if not isinstance(identifier, str) or not identifier or identifier in seen:
            errors.append(f"{identifier}: identificador vacío o repetido.")
        seen.add(identifier if isinstance(identifier, str) else None)
    for zoom in plan.get("zooms") or []:
        if type(zoom.get("scale")) not in (int, float) or not ZOOM_MIN <= zoom["scale"] <= ZOOM_MAX:
            errors.append(f"{zoom.get('id')}: escala de zoom fuera de {ZOOM_MIN}–{ZOOM_MAX}.")
    if "take_transition" in plan and plan["take_transition"] not in TAKE_TRANSITIONS:
        errors.append("take_transition: valor desconocido.")
    if "emphasis_word_ids" in plan:
        emphasis = plan["emphasis_word_ids"]
        if (not isinstance(emphasis, list) or not all(isinstance(word, str) for word in emphasis)
                or len(emphasis) > MAX_EMPHASIS or len(set(emphasis)) != len(emphasis)):
            errors.append(f"emphasis_word_ids: lista de textos sin repetidos, hasta {MAX_EMPHASIS}.")
        elif any(word not in frames for word in emphasis):
            errors.append("emphasis_word_ids: una palabra no existe en el video.")
    for event in events:
        name = event.get("id")
        if event.get("kind") == "photo":
            photo = event.get("photo")
            if (not isinstance(photo, dict) or photo.get("provider") not in ("Pexels", "Openverse", "Pixabay", "Wikimedia")
                    or not isinstance(photo.get("asset"), str)
                    or not re.fullmatch(r"work/[a-z0-9-]+/photos/(?:(?:pexels|pixabay|wikimedia)-[0-9]+|openverse-[a-f0-9-]{36})\.jpg", photo["asset"])):
                errors.append(f"{name}: foto local inválida.")
            else:
                provider, identifier = photo["provider"], photo.get("id")
                numeric_id = type(identifier) in (int, float) and 0 < identifier <= 9007199254740991 and identifier == int(identifier)
                cc0 = photo.get("license") == "https://creativecommons.org/publicdomain/zero/1.0/"
                valid = (
                    (provider == "Pexels" and numeric_id) or
                    (provider == "Wikimedia" and numeric_id and cc0) or
                    (provider == "Pixabay" and numeric_id and photo.get("license") == "https://pixabay.com/service/license-summary/") or
                    (provider == "Openverse" and isinstance(identifier, str) and
                     re.fullmatch(r"[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}", identifier) and cc0))
                if not valid:
                    errors.append(f"{name}: licencia o identificador de foto inválido.")
        duration, offset = event.get("duration_frames"), event.get("offset_frames")
        anchor = frames.get(event.get("anchor_word_id"))
        if anchor is None:
            errors.append(f"{name}: la palabra de anclaje no existe.")
        elif (type(duration) is not int or type(offset) is not int
              or not 1 <= duration <= total or not 0 <= anchor + offset < total):
            errors.append(f"{name}: duración o posición fuera del video.")
    return errors


def head_key(clip):
    """Identidad de una toma para reutilizar su cabeza: id, inicio y duración en el original."""
    return f"{clip['id']}|{clip['source_in_frame']}|{clip['duration_frames']}"


def snapshot_heads(timeline_path, output):
    """Guarda las cabezas del timeline actual antes de que la etapa de corte lo reescriba."""
    output = Path(output)
    output.unlink(missing_ok=True)
    if not Path(timeline_path).exists():
        return
    timeline = json.loads(Path(timeline_path).read_text(encoding="utf-8"))
    heads = {head_key(clip): clip["head"] for clip in timeline["clips"] if "head" in clip}
    output.write_text(json.dumps(heads, ensure_ascii=False), encoding="utf-8")


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
