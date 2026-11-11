"""Literal, frame-based support events. This module never changes source/audio timing."""
import math
import re

ICON_TERMS = {
    'people': r'\b(gente|personas?|poblaci[oó]n|pacientes?|people|persons?)\b',
    'heart': r'\b(coraz[oó]n|card[ií]ac\w*|heart)\b',
    'brain': r'\b(cerebro|mente|mental|brain|mind)\b',
    'home': r'\b(casa|hogar|home|house)\b',
    'book': r'\b(libros?|leer|lectura|book|reading)\b',
    'growth': r'\b(crec\w*|creci\w*|aument\w*|growth|grow\w*)\b',
    'question': r'\b(pregunt\w*|question\w*)\b|[¿?]',
}


def tokens(text):
    return re.findall(r'[^\W_]+', str(text).casefold(), re.UNICODE)


def literal_excerpt(quote, selected):
    """Return source spelling, never a paraphrase or an ellipsis which drops tokens."""
    if not isinstance(selected, str) or not selected.strip():
        return None
    for match in re.finditer(re.escape(selected.strip()), quote, re.I):
        if (match.start() == 0 or not quote[match.start()-1].isalnum()) and (match.end() == len(quote) or not quote[match.end()].isalnum()):
            return match.group()
    spans = list(re.finditer(r'[^\W_]+', quote, re.UNICODE))
    needle = tokens(selected)
    for index in range(len(spans) - len(needle) + 1):
        if needle and [span.group().casefold() for span in spans[index:index + len(needle)]] == needle:
            return quote[spans[index].start():spans[index + len(needle) - 1].end()]
    return None


def excerpt_words(excerpt, words):
    flattened = [(token, word) for word in words for token in tokens(word['text'])]
    needle = tokens(excerpt)
    for index in range(len(flattened) - len(needle) + 1):
        if needle and [row[0] for row in flattened[index:index + len(needle)]] == needle:
            return [row[1] for row in flattened[index:index + len(needle)]]
    return []


def reading_frames(text, pace='balanced', fps=30):
    # Explicit product heuristic, not a claim that viewers have validated these rates.
    wpm = {'calm': 145, 'balanced': 185, 'brisk': 225}[pace]
    return max(round(.9 * fps), math.ceil((len(tokens(text)) * 60 / wpm + .55) * fps))


def graphic_reading_floor(text, fps=30):
    """Minimum display time for a structured graphic, independent of reading pace: never shortened to fit."""
    return max(round(2.2 * fps), math.ceil((.35 * len(tokens(text)) + .8) * fps))


def event_anchor_frame(event, sentence, words):
    labels = event.get('labels') or []
    selected = event.get('anchor', '') if event.get('kind') == 'broll' else labels[0] if isinstance(labels, list) and labels else ''
    excerpt = literal_excerpt(sentence['text'], selected)
    timed = excerpt_words(excerpt, [word for word in words if sentence['start'] <= word['start'] < sentence['end']]) if excerpt else []
    return timed[0]['start'] if timed else None


def editorial_boundary(event, sentence, scenes, next_event, total_frames, preferences, fps=30, anchor_frame=None):
    """Composed containers may cross source joins; scene/audio timing stays intact."""
    controls = preferences['editorial']
    composed = controls['emphasisStyle'] in ('composed', 'fullscreen') or event['kind'] == 'broll'
    anchor = sentence['start'] if anchor_frame is None else anchor_frame
    scene_end = next((scene['from'] + scene['frames'] for scene in scenes if scene['from'] <= anchor < scene['from'] + scene['frames']), total_frames)
    # At most three extra seconds after this utterance, never across the next
    # semantic proposal or end of the original montage. No time is added to media.
    return min(next_event, total_frames, sentence['end'] + round(3 * fps) if composed else scene_end)


def event_overlaps(start, frames, accepted, guard=0):
    """Half-open intervals in v1; caller retains the historical 15-frame guard."""
    return any(start < beat['from'] + beat['frames'] + guard and start + frames + guard > beat['from'] for beat in accepted)


def limit_media_duration(beat, resource):
    """A reviewed visual clip cannot outlive its actual decoded duration."""
    available = resource['durationFrames']
    if type(available) is not int or available <= 0:
        raise ValueError('Reviewed media duration must be a positive frame count')
    if beat['frames'] <= available:
        return []
    requested = beat['frames']
    beat['frames'] = available
    if beat.get('textPages'):
        beat['textPages'] = [{**page,'frames':min(page['frames'],available-page['from'])}
                             for page in beat['textPages'] if page['from'] < available]
    return [{'beatId':beat['id'],'from':beat['from'],'frames':available,'requiredFrames':requested,
             'reason':'Reviewed media duration overrides requested display/reading duration; support shortened without moving source voice'}]


def grounded_beat(event, sentence, words, boundary, preferences, fps=30):
    """Return (beat fields, warnings, rejection); leave all speech and scenes untouched."""
    editorial = preferences['editorial']
    kind = event['kind']
    quote = sentence['text']
    labels = event.get('labels', [])
    if not isinstance(labels, list):
        return None, [], 'Labels must be literal text excerpts'
    selected = event.get('anchor', '') if kind == 'broll' else labels[0] if labels else ''
    headline = literal_excerpt(quote, selected)
    if not headline:
        return None, [], 'Selected headline or anchor is not a literal excerpt'
    grounded_labels = [literal_excerpt(quote, label) for label in labels]
    if kind != 'broll' and (any(label is None for label in grounded_labels) or
                            (kind in ('compare', 'steps') and len(labels) < 2)):
        return None, [], 'Every graphic label must be copied literally from the sentence'
    sentence_words = [word for word in words if sentence['start'] <= word['start'] < sentence['end']]
    anchors = excerpt_words(headline, sentence_words)
    if not anchors:
        return None, [], 'Exact source word timing missing for selected excerpt'
    icon = event.get('icon')
    if kind == 'icon' and (icon not in ICON_TERMS or not re.search(ICON_TERMS[icon], headline, re.I)):
        return None, [], 'Icon meaning absent from the exact literal excerpt'
    start = anchors[0]['start']
    text = ' · '.join(grounded_labels) if kind in ('steps', 'compare') else headline
    needed = reading_frames(text, editorial['readingPace'], fps)
    if kind in ('steps', 'compare'):
        needed = max(needed, graphic_reading_floor(text, fps))
    timed_labels = [excerpt_words(label, sentence_words) for label in grounded_labels] if kind != 'broll' else [anchors]
    if any(not group for group in timed_labels):
        return None, [], 'Exact source word timing missing for a graphic label'
    spoken_end = max(word['end'] for group in timed_labels for word in group)
    desired = max(needed, spoken_end - start)
    available = int(boundary - start)
    if available < max(12, round(.4 * fps)):
        return None, [], 'No display interval before the next event or scene boundary'
    frames = min(desired, available)
    if kind in ('steps', 'compare') and frames < graphic_reading_floor(text, fps):
        # Never shorten a structured graphic below its floor; the original footage is kept instead.
        return None, [], 'Graphic cannot keep its minimum reading time before the next event or scene boundary'
    warnings = []
    if frames < needed:
        warnings.append({'reason': 'Reading budget exceeds available interval; literal excerpt retained and speech unchanged',
                         'from': start, 'frames': frames, 'requiredFrames': needed})
    style = editorial['emphasisStyle']
    # Structured graphics keep the presenter visible: a measured upper band, or a reserved composition.
    presentation = ('overlay' if kind in ('compare', 'steps') else 'fullscreen') if style == 'fullscreen' else 'reserved' if style == 'composed' else 'overlay'
    # Presence also controls media layout; presenter never yields the entire frame to stock.
    if kind == 'broll':
        presentation = 'inset' if editorial['presence'] == 'presenter' else 'fullscreen' if editorial['presence'] == 'visual' else 'reserved'
    beat = {'kind': kind, 'from': start, 'frames': frames, 'quote': quote, 'title': headline,
            'headline': headline, 'labels': grounded_labels, 'reason': event.get('reason', ''),
            'presentation': presentation}
    if icon:
        beat['icon'] = icon
    if kind != 'broll':
        # Headline is independent of ASR pages and remains mounted during pauses.
        beat['textPages'] = [{'text': headline, 'from': 0, 'frames': frames}]
    return beat, warnings, None
