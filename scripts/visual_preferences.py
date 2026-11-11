"""Explicit questionnaire choices constrain editorial proposals before stock lookup."""
def allowed_event(kind, preferences):
    editorial = preferences.get('editorial') or {}
    if editorial.get('version') == 1:
        if kind == 'card' and editorial.get('captionIntent', 'both') == 'literal':
            return False
        if kind == 'broll' and editorial.get('resourceStyle') == 'diagram':
            return False
        if kind in ('compare', 'steps', 'icon') and editorial.get('resourceStyle') == 'real':
            return False
    if kind == 'icon':
        return editorial.get('version') == 1 and preferences.get('graphics') != 'none'
    if kind == 'card':
        return preferences.get('emphasis_mode') != 'none'
    if kind == 'broll':
        return preferences.get('support_media') != 'none'
    if kind in ('compare', 'steps'):
        return preferences.get('graphics') != 'none' and kind in preferences.get('graphic_kinds', ['compare', 'steps'])
    return False


def use_still(preferences, beat):
    choice = preferences.get('support_media', 'auto')
    return choice == 'still' or (choice == 'auto' and preferences.get('editorialFamilyId') == 'estampa' and beat.get('variantId') == 'framed')


def materialize_stills(folder, edit, command):
    from pathlib import Path
    for beat in edit['beats']:
        if beat['kind'] != 'broll' or beat.get('mediaType') == 'image' or not use_still(edit['preferences'], beat):
            continue
        original = beat['asset']
        image_asset = Path(original).stem + '-plate.jpg'
        command(['ffmpeg', '-v', 'error', '-y', '-ss', '1', '-i', folder / original, '-frames:v', '1', folder / image_asset], 30)
        beat['asset'] = image_asset
        beat['mediaType'] = 'image'
        provenance = next((a for a in edit['assets'] if a['file'] == original), None)
        if provenance:
            edit['assets'].append({**provenance, 'file': image_asset, 'derivedFrom': original})
