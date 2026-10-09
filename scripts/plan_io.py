"""Lee y escribe el plan de edición con un evento por renglón."""

import json
import re
from pathlib import Path


def empty_plan(style_id):
    """Plan sin decisiones: sólo captions y sonidos de corte de toma."""
    return {"style": style_id, "version": 1, "cuts": [], "cards": [],
            "backgrounds": [], "music": None}


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
