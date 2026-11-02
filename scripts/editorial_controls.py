"""Compact director input and local limits. Renderer/audio settings stay local."""
from visual_preferences import allowed_event


def event_limits(brief):
    # Historical briefs retain their original showcase contract.
    if brief.get('resourcePolicy') != 'relevant-only':
        return {'card': 2, 'compare': 1, 'steps': 1, 'broll': 4}, 180
    prefs = brief['preferences']
    cards, clips, gap = {'clean': (1, 1, 360), 'balanced': (2, 2, 240), 'dynamic': (2, 4, 180)}[prefs['vibe']]
    maxima = {'card': cards, 'compare': 1, 'steps': 1, 'broll': clips}
    return {kind: maximum if allowed_event(kind, prefs) else 0 for kind, maximum in maxima.items()}, gap


def director_input(brief, references, sentences):
    prefs = brief['preferences']
    limits, gap = event_limits(brief)
    intent = {key: brief[key] for key in ('objective', 'audience') if brief.get(key)}
    intent.update({key: prefs[key] for key in ('topic', 'notes', 'brand_name') if prefs.get(key)})
    if brief.get('resourceNotes'):
        intent['resourceNotes'] = brief['resourceNotes']
    return {'policy': brief.get('resourcePolicy', 'showcase'), 'intent': intent, 'limits': limits, 'minimumGapFrames': gap,
            'emphasis': prefs.get('emphasis_mode', 'overlay'),
            'supportMedia': prefs.get('support_media', 'auto'),
            'implementedReferencePatterns': references, 'sentences': sentences}


def constrain_events(events, brief):
    """Enforce caps before stock search, even if a provider returns invalid output."""
    if brief.get('resourcePolicy') != 'relevant-only':
        return [event for event in events if allowed_event(event['kind'], brief['preferences'])]
    limits, _ = event_limits(brief)
    accepted = []
    for event in events:
        kind = event.get('kind')
        if limits.get(kind, 0) > 0:
            accepted.append(event)
            limits[kind] -= 1
    return accepted
