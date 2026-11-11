"""Deterministic presentation selection after semantic grounding; never edits speech."""
import json
from pathlib import Path
CATALOG = json.loads((Path(__file__).resolve().parents[1]/'style/editorial-recipes-v1.json').read_text())

def decorate(beats, scenes, captions, preferences):
    family_id = preferences.get('editorialFamilyId')
    family = next((f for f in CATALOG['families'] if f['id'] == family_id), None)
    if family_id and not family:
        raise ValueError('Familia editorial desconocida')
    # Legacy briefs keep their font; the questionnaire explicitly chooses new families.
    family = family or next(f for f in CATALOG['families'] if f['id'] == 'enlace')
    counts = {}
    for beat in sorted(beats, key=lambda b:b['from']):
        kind=beat['kind']; choices=family['cards'] if kind=='card' else family['broll'] if kind=='broll' else ['semantic-icon'] if kind=='icon' else ['comparison'] if kind=='compare' else ['idea-map']
        beat['variantId']=choices[counts.get(kind,0)%len(choices)]; counts[kind]=counts.get(kind,0)+1
        beat['recipeId']=family['id']; beat['purpose']=beat.get('reason') or 'Apoyar esta frase literal'
        beat['sourceWordIds']=[i for i,w in enumerate(captions) if w['startMs'] < (beat['from']+beat['frames'])/30*1000 and w['endMs'] > beat['from']/30*1000]
        if not beat['sourceWordIds']:
            raise ValueError('Recurso sin anclaje al discurso')
    # Count only explicit render events at actual joins, never count cards as transitions.
    return [dict(from_=s['from'], frames=min(12,s['frames']), variantId=family['transition'],purpose='Unir tomas sin alterar voz') for s in scenes[1:] if s['frames']>1]
