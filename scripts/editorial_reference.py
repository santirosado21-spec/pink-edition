"""Only explicitly approved, evidenced patterns from this session reach direction."""
import json
import math
from pathlib import Path

ASPECTS = {'short-caption-pages': 'rhythm', 'keyword-emphasis': 'typography',
           'headline-scenes': 'typography', 'semantic-icons': 'resources',
           'layered-composition': 'composition', 'stable-framing': 'composition',
           'contextual-broll': 'resources'}


def approved_directions(brief, folder=None, snapshot=None):
    if not isinstance(brief, dict) or not isinstance(brief.get('preferences', {}), dict):
        return []
    editorial = brief.get('preferences', {}).get('editorial') or {}
    if not isinstance(editorial, dict) or editorial.get('version') != 1:
        return []
    selected = editorial.get('referenceAspects', [])
    if not isinstance(selected, list):
        return []
    if snapshot is None and folder is not None:
        snapshot = json.loads((Path(folder) / 'input.json').read_text()).get('brand', {})
    if not isinstance(snapshot or {}, dict):
        return []
    patterns = (snapshot or {}).get('patterns', [])
    if not isinstance(patterns, list):
        return []
    result = []
    for pattern in patterns:
        if not isinstance(pattern, dict):
            continue
        aspect = ASPECTS.get(pattern.get('adaptation'))
        source = pattern.get('sourceSha256', '')
        evidence = pattern.get('evidenceSeconds', [])
        if (pattern.get('userApproval') != 'liked' or pattern.get('implementation') != 'available'
                or aspect not in selected or not isinstance(source, str) or len(source) != 64 or any(c not in '0123456789abcdef' for c in source)
                or not isinstance(evidence, list) or not evidence or any(type(t) not in (int, float) or not math.isfinite(t) or t < 0 for t in evidence)):
            continue
        result.append({**pattern, 'aspect': aspect, 'description': str(pattern.get('description', ''))[:400]})
    return result[:16]
