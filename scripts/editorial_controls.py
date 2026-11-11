"""Compact director input and local limits. Renderer/audio settings stay local."""
from visual_preferences import allowed_event

def caption_reference_adaptations(directions):
    """Resource references cannot disable the renderer's default caption paging."""
    supported = {'short-caption-pages', 'keyword-emphasis'}
    selected = sorted({pattern.get('adaptation') for pattern in directions if pattern.get('adaptation') in supported})
    return selected or None


def event_limits(brief):
    # Historical briefs retain their original showcase contract.
    if brief.get('resourcePolicy') != 'relevant-only':
        return {'card': 2, 'compare': 1, 'steps': 1, 'broll': 4}, 180
    prefs = brief['preferences']
    cards, clips, gap = {'clean': (1, 1, 360), 'balanced': (2, 2, 240), 'dynamic': (2, 4, 180)}[prefs['vibe']]
    maxima = {'card': cards, 'compare': 1, 'steps': 1, 'broll': clips}
    editorial = prefs.get('editorial') or {}
    if editorial.get('version') == 1:
        maxima['icon'] = 1
        if editorial.get('presence') == 'presenter':
            maxima = {kind: min(1, maximum) for kind, maximum in maxima.items()}
            gap = max(gap, 360)
    return {kind: maximum if allowed_event(kind, prefs) else 0 for kind, maximum in maxima.items()}, gap


def director_input(brief, references, sentences):
    prefs = brief['preferences']
    limits, gap = event_limits(brief)
    intent = {key: brief[key] for key in ('objective', 'audience') if brief.get(key)}
    intent.update({key: prefs[key] for key in ('topic', 'notes', 'brand_name') if prefs.get(key)})
    if brief.get('resourceNotes'):
        intent['resourceNotes'] = brief['resourceNotes']
    context = {'policy': brief.get('resourcePolicy', 'showcase'), 'intent': intent, 'limits': limits, 'minimumGapFrames': gap,
            'emphasis': prefs.get('emphasis_mode', 'overlay'),
            'supportMedia': prefs.get('support_media', 'auto'),
            'implementedReferencePatterns': references, 'sentences': sentences}
    if (prefs.get('editorial') or {}).get('version') == 1:
        context['editorial'] = prefs['editorial']
    return context


def constrain_events(events, brief, review=None):
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
        elif review is not None:
            review.append({'id': event.get('proposalId', 'proposal-' + str(len(review))), 'kind': kind,
                           'sentence': event.get('sentence'), 'status': 'rejected',
                           'reason': 'Resource excluded by questionnaire' if not allowed_event(kind, brief['preferences']) else 'Maximum event budget reached'})
    return accepted
