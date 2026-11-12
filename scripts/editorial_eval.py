"""Offline, equal-input model comparison. Never invokes a provider or uploads media.

package EDIT_JSON --media-root FOLDER --out PACKAGE_JSON
compare PACKAGE_JSON BASELINE_JSON CANDIDATE_JSON --out REPORT_JSON
Each imported result carries packageSha256, edit, optional model/usage/rates/human.
Usage input_tokens includes cached_input_tokens; output_tokens includes reasoning.
All monetary results are declared API estimates, excluding render and human cost.
"""
import argparse
import hashlib
import json
import math
import re
from pathlib import Path

def _sha256_stream(stream):
    if hasattr(hashlib, 'file_digest'):
        return hashlib.file_digest(stream, 'sha256').hexdigest()
    digest = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1 << 20), b''):
        digest.update(chunk)
    return digest.hexdigest()




def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def package(edit, media_root=None):
    assets = sorted(set([s['asset'] for s in edit['scenes']] + [b['asset'] for b in edit['beats'] if b.get('asset')]
                        + [s['asset'] for s in edit.get('soundEvents', [])] + ([edit['music']] if edit.get('music') else [])))
    inventory = []
    for name in assets:
        if media_root is None:
            raise ValueError('Se requiere media-root para verificar los mismos recursos.')
        root = Path(media_root).resolve()
        file = (root / name).resolve()
        if not file.is_relative_to(root) or not file.is_file():
            raise ValueError('Recurso ausente o fuera de la carpeta del encargo.')
        with file.open('rb') as stream:
            sha = _sha256_stream(stream)
        inventory.append({'asset': name, 'sha256': sha})
    context = {key: edit[key] for key in ('fps', 'width', 'height', 'frames', 'scenes', 'captions', 'preferences')}
    context.update(music=edit.get('music'), musicFrames=edit.get('musicFrames', 1),
                   soundEvents=edit.get('soundEvents', []), transitions=edit.get('transitions', []))
    payload = {'version': 1, 'context': context, 'assetInventory': inventory,
               'rendererContract': {'editorialVersion': edit.get('editorialVersion'), 'visualLayoutVersion': edit.get('visualLayoutVersion'),
                                    'captionLayoutVersion': edit.get('captionLayoutVersion'), 'captionAdaptations': edit.get('captionAdaptations')},
               'referencePatterns': edit.get('referencePatterns', []),
               'scope': 'Private local comparison package; no inference executed. Review complete MP4s separately.'}
    return {**payload, 'packageSha256': digest(payload)}


def finite(value, label):
    if type(value) not in (float, int) or not math.isfinite(value) or value < 0:
        raise ValueError(f'{label} debe ser un número no negativo finito.')
    return value


def api_estimate(result):
    if result.get('usage') is None or result.get('rates') is None:
        return None
    usage, rates = result['usage'], result['rates']
    total = finite(usage['input_tokens'], 'input_tokens')
    cached = finite(usage.get('cached_input_tokens', 0), 'cached_input_tokens')
    output = finite(usage['output_tokens'], 'output_tokens')
    if cached > total:
        raise ValueError('cached_input_tokens no puede superar input_tokens.')
    incoming = finite(rates['inputPerMillion'], 'inputPerMillion')
    outgoing = finite(rates['outputPerMillion'], 'outputPerMillion')
    cache = finite(rates.get('cacheReadPerMillion', incoming), 'cacheReadPerMillion')
    return round(((total - cached) * incoming + cached * cache + output * outgoing) / 1_000_000, 6)


def assess(pack, result):
    if result.get('packageSha256') != pack['packageSha256']:
        raise ValueError('Las propuestas no usan el mismo paquete verificado.')
    edit, context = result['edit'], pack['context']
    problems = []
    for field in ('frames', 'fps', 'width', 'height', 'scenes', 'captions', 'preferences'):
        if canonical(edit.get(field)) != canonical(context[field]):
            problems.append(f'changed-{field}')
    for field, fallback in [('music', None), ('musicFrames', 1), ('soundEvents', []), ('transitions', [])]:
        if canonical(edit.get(field, fallback)) != canonical(context[field]):
            problems.append(f'changed-{field}')
    if edit.get('editorialVersion') != pack['rendererContract']['editorialVersion']:
        problems.append('changed-renderer-contract')
    if edit.get('visualLayoutVersion') != pack['rendererContract']['visualLayoutVersion']:
        problems.append('changed-visual-layout')
    for field in ('captionLayoutVersion', 'captionAdaptations'):
        if canonical(edit.get(field)) != canonical(pack['rendererContract'][field]):
            problems.append('changed-' + field)
    if canonical(edit.get('referencePatterns', [])) != canonical(pack['referencePatterns']):
        problems.append('changed-reference-evidence')
    inventory = {x['asset'] for x in pack['assetInventory']}
    transcript = ' '.join(' '.join(word['text'] for word in context['captions']).casefold().split())
    spoken = [(token, word['startMs'] / 1000 * context['fps'])
              for word in context['captions'] for token in re.findall(r'[^\W_]+', word['text'].casefold(), re.UNICODE)]
    for beat in edit.get('beats', []):
        name = str(beat.get('id', '?'))
        start, duration = beat.get('from'), beat.get('frames')
        if type(start) is not int or type(duration) is not int or start < 0 or duration <= 0 or start + duration > context['frames']:
            problems.append(name + ':invalid-bounds')
        if beat.get('kind') not in ('card', 'steps', 'compare', 'broll', 'icon'):
            problems.append(name + ':unsupported-kind')
        if beat.get('asset') and beat['asset'] not in inventory:
            problems.append(name + ':unverified-asset')
        quote = ' '.join(str(beat.get('quote', '')).casefold().split())
        headline = ' '.join(str(beat.get('headline', beat.get('title', ''))).casefold().split())
        if not quote or quote not in transcript:
            problems.append(name + ':ungrounded-source-quote')
        if headline and headline not in quote:
            problems.append(name + ':ungrounded-headline')
        needle = re.findall(r'[^\W_]+', headline, re.UNICODE)
        if needle and type(start) is int:
            anchored = any([row[0] for row in spoken[i:i+len(needle)]] == needle and abs(spoken[i][1] - start) <= 2
                           for i in range(len(spoken) - len(needle) + 1))
            if not anchored:
                problems.append(name + ':headline-time-not-anchored')
        if any(' '.join(str(label).casefold().split()) not in quote for label in beat.get('labels', [])):
            problems.append(name + ':ungrounded-labels')
    human = result.get('human', {})
    if not isinstance(human, dict) or (human.get('approved') is not None and type(human.get('approved')) is not bool):
        raise ValueError('human.approved requiere true, false o null.')
    if human.get('correctionMinutes') is not None:
        finite(human['correctionMinutes'], 'correctionMinutes')
    return {'technicalProblems': problems, 'technicalContractPassed': not problems,
            'apiEstimateUsd': api_estimate(result), 'human': human,
            'scope': 'Plan checks only. No rendered quality, audio, speed or aesthetic winner inferred.'}


def compare(pack, baseline, candidate):
    payload = {key: value for key, value in pack.items() if key != 'packageSha256'}
    if digest(payload) != pack.get('packageSha256'):
        raise ValueError('El paquete fue modificado después de calcular su huella.')
    # Model identity is separated from blind labels; no score is derived from brand.
    return {'version': 1, 'packageSha256': pack['packageSha256'],
            'blindResults': {'A': assess(pack, baseline), 'B': assess(pack, candidate)},
            'identityKey': {'A': baseline.get('model', 'unspecified'), 'B': candidate.get('model', 'unspecified')},
            'winner': None, 'reason': 'Requiere revisión humana a ciegas de MP4 completos con audio.',
            'rubric': ['lectura', 'continuidad', 'pertinencia', 'composición', 'cercanía a referencia', 'minutos de corrección'],
            'costScope': 'API estimates declared by each imported result; total cost per accepted video requires all attempts and human/infrastructure costs.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action', required=True)
    create = sub.add_parser('package'); create.add_argument('edit', type=Path); create.add_argument('--media-root', type=Path); create.add_argument('--out', required=True, type=Path)
    check = sub.add_parser('compare'); check.add_argument('package', type=Path); check.add_argument('baseline', type=Path); check.add_argument('candidate', type=Path); check.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    load = lambda file: json.loads(file.read_text())
    result = package(load(args.edit), args.media_root) if args.action == 'package' else compare(load(args.package), load(args.baseline), load(args.candidate))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))
    print(json.dumps({'output': str(args.out), 'inferenceExecuted': False}))


if __name__ == '__main__':
    main()
