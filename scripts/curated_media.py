"""Bounded, explicit local support library; no discovery of raw footage or references."""
import hashlib
import json
import re
from pathlib import Path

LICENSES = frozenset({'CC0', 'Public domain', 'CC BY 4.0', 'CC BY-SA 4.0', 'Owned', 'Original'})
VIDEO_EXTENSIONS = frozenset({'.mp4', '.mov', '.m4v', '.webm', '.ogv'})
MAX_ENTRIES = 128
MAX_INDEX_BYTES = 2 * 1024 * 1024
MAX_CANDIDATES = 12


def file_fingerprint(path):
    """Content digest, streamed to avoid loading a clip into memory."""
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def terms(value):
    return set(re.findall(r'[^\W_]+', str(value).casefold()))


def curated_candidates(root, query):
    """Return candidates, revision fingerprint and explicit rejection evidence.

    Only the first 128 declared entries are inspected; no recursive scanning.
    Only up to 12 relevant approved clips are content-hashed/review candidates.
    Fingerprint also includes the index bytes and metadata of all declared files.
    """
    root = Path(root).resolve()
    index = root / 'index.json'
    result = {'candidates': [], 'rejections': [], 'revision': None, 'fingerprint': 'absent'}
    if not index.exists():
        return result
    try:
        if not index.resolve().is_relative_to(root):
            raise ValueError('Index must remain inside the local library root')
        if index.stat().st_size > MAX_INDEX_BYTES:
            raise ValueError('Index exceeds 2 MiB limit')
        raw = index.read_bytes()
        catalog = json.loads(raw)
        if not isinstance(catalog, dict) or not isinstance(catalog.get('entries'), list):
            raise ValueError('Index must contain an entries array')
        if not isinstance(catalog.get('revision'), str) or not catalog['revision'].strip():
            raise ValueError('Index must declare a nonempty revision string')
        result['revision'] = catalog.get('revision')
    except (OSError, ValueError) as error:
        result.update(fingerprint='invalid-index', rejections=[{'reason': 'Local support index unavailable: ' + str(error)}])
        return result
    manifest = {'index': hashlib.sha256(raw).hexdigest(), 'revision': result['revision'], 'files': []}
    requested = terms(query)
    action_terms = requested - {'people', 'person', 'video', 'clip'}
    relevant_terms = action_terms or requested
    for entry_number, entry in enumerate(catalog['entries'][:MAX_ENTRIES]):
        label = {'entry': entry_number}
        try:
            if not isinstance(entry, dict):
                raise ValueError('Entry must be an object')
            if entry.get('approved') is not True or entry.get('role') != 'support':
                raise ValueError('Only explicitly approved role=support entries are eligible; A-roll/references are excluded')
            for field in ('file', 'source', 'author', 'license', 'title', 'description'):
                if not isinstance(entry.get(field), str) or not entry[field].strip():
                    raise ValueError('Missing declared ' + field)
            label['source'] = entry['source']
            if entry['license'] not in LICENSES:
                raise ValueError('License/ownership declaration is outside the explicit allowlist')
            relative = Path(entry['file'])
            if relative.is_absolute():
                raise ValueError('File must be relative to the local library root')
            path = (root / relative).resolve()
            if not path.is_relative_to(root) or path.suffix.lower() not in VIDEO_EXTENSIONS or not path.is_file():
                raise ValueError('Local support file missing, outside library root, or unsupported video type')
            stat = path.stat()
            manifest['files'].append({'file': entry['file'], 'size': stat.st_size, 'mtimeNs': stat.st_mtime_ns})
            tags = entry.get('tags')
            if not isinstance(tags, list) or not tags or any(not isinstance(tag, str) or not tag.strip() for tag in tags):
                raise ValueError('Tags must be a nonempty array of strings')
            text = ' '.join([entry['title'], str(entry.get('description', '')), *tags])
            if not relevant_terms.intersection(terms(text)):
                raise ValueError('Metadata does not match the requested filmable concept')
            if len(result['candidates']) >= MAX_CANDIDATES:
                raise ValueError('Bounded local shortlist already contains 12 relevant candidates')
            digest = file_fingerprint(path)
            manifest['files'][-1]['sha256'] = digest
            result['candidates'].append({'localFile': str(path), 'libraryFile': entry['file'],
                                          'source': entry['source'], 'author': entry['author'], 'license': entry['license'],
                                          'title': entry['title'], 'description': str(entry.get('description', ''))[:350],
                                          'searchQuery': query, 'sourceFileSha256': digest,
                                          'catalogRevision': result['revision'], 'approved': True, 'role': 'support'})
        except (OSError, ValueError) as error:
            result['rejections'].append({**label, 'reason': str(error)})
    if len(catalog['entries']) > MAX_ENTRIES:
        result['rejections'].append({'reason': 'Only first 128 declared entries inspected; no recursive scanning'})
    result['fingerprint'] = hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()
    return result
