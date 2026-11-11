"""Validate editorial timing and fullscreen background corners in actual MP4s.

No model calls, aesthetic approval, or inference of audio semantics.
"""
import argparse
import json
import math
from pathlib import Path
import subprocess
import tempfile


def timeline_checks(edit):
    errors, warnings = [], []
    fps, total = edit['fps'], edit['frames']
    previous_end = -1
    for word in edit['captions']:
        start, end = word['startMs'], word['endMs']
        if not all(type(v) in (int, float) and math.isfinite(v) for v in (start, end)) or start < 0 or end < start or end > total / fps * 1000 + 100:
            errors.append({'code': 'invalid-word-bounds'})
        if start < previous_end - 100:
            warnings.append({'code': 'overlapping-asr-words', 'fromMs': start})
        previous_end = max(previous_end, end)
    for beat in edit['beats']:
        identifier = beat['id']
        if not (type(beat['from']) is int and type(beat['frames']) is int and beat['from'] >= 0 and beat['frames'] > 0 and beat['from'] + beat['frames'] <= total):
            errors.append({'code': 'event-outside-timeline', 'beatId': identifier})
            continue
        pages = beat.get('textPages', [])
        last = 0
        for page in pages:
            if not (type(page['from']) is int and type(page['frames']) is int and page['from'] >= last and page['frames'] > 0 and page['from'] + page['frames'] <= beat['frames']):
                errors.append({'code': 'invalid-text-page', 'beatId': identifier})
            last = page['from'] + page['frames']
            if page['frames'] < round(.8 * fps):
                warnings.append({'code': 'brief-text-page', 'beatId': identifier, 'frames': page['frames']})
    return errors, warnings


def measured_containers(edit, movie):
    """Inspect every interior frame for the known cream text-scene background.

    Four corners avoid headline pixels; fade boundaries are intentionally omitted.
    Temporary file bounds memory independently of duration/resolution.
    """
    if edit.get('editorialVersion') != 1:
        return [], [], 0
    beats = [b for b in edit['beats'] if b['kind'] == 'card' and b.get('presentation') == 'fullscreen']
    if not beats:
        return [], [], 0
    fps, width, height = edit['fps'], 32, 56
    padding = max(12, math.ceil(.4 * fps))
    wanted = {}
    for beat in beats:
        for frame in range(beat['from'] + padding, beat['from'] + beat['frames'] - padding):
            wanted[frame] = beat['id']
    errors, checked = [], 0
    with tempfile.TemporaryFile() as raw:
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(movie), '-an', '-vf', f'fps={fps},scale={width}:{height}',
                        '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], stdout=raw, stderr=subprocess.PIPE, check=True, timeout=300)
        raw.seek(0)
        index, size = 0, width * height * 3
        while True:
            data = raw.read(size)
            if not data: break
            if len(data) != size: raise ValueError('Fotograma de revisión incompleto.')
            if index in wanted:
                checked += 1
                matches = 0
                for x, y in [(2, 3), (29, 3), (2, 52), (29, 52)]:
                    at = (y * width + x) * 3
                    r, g, b = data[at:at+3]
                    matches += abs(r - 247) <= 22 and abs(g - 245) <= 22 and abs(b - 239) <= 22
                if matches < 3:
                    errors.append({'code': 'fullscreen-container-discontinuity', 'beatId': wanted[index], 'frame': index})
            index += 1
        missing = sorted(frame for frame in wanted if frame >= index)
        if missing: errors.append({'code': 'missing-rendered-frames', 'firstFrame': missing[0]})
    return errors, [], checked


def measure(edit, movie=None):
    errors, warnings = timeline_checks(edit)
    frames = 0
    media_validated = False
    if movie is not None and not errors:
        try:
            if not Path(movie).is_file():
                raise ValueError('El MP4 no existe.')
            probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(movie)], stderr=subprocess.PIPE, timeout=30))
            if not any(s.get('codec_type') == 'video' for s in probe.get('streams', [])):
                raise ValueError('No contiene video.')
            if abs(float(probe['format']['duration']) - edit['frames'] / edit['fps']) > .2:
                raise ValueError('Duración distinta del timeline.')
            media_validated = True
            rendered, notes, frames = measured_containers(edit, movie)
            errors.extend(rendered); warnings.extend(notes)
        except (ValueError, OSError, KeyError, subprocess.SubprocessError):
            errors.append({'code': 'invalid-or-unreadable-movie'})
    return {'version': 1, 'state': 'failed' if errors else 'review' if warnings else 'passed',
            'errors': errors, 'warnings': warnings, 'containerFramesMeasured': frames,
            'movieInspected': frames > 0, 'mediaValidated': media_validated, 'aestheticApproval': 'pending',
            'containerEvidence': 'Four background corners per interior frame; central content is not semantically inspected.',
            'scope': 'Word/event bounds and fullscreen background corner continuity only. Does not rule out central reveals or certify aesthetic/audio quality; combine with renderer state regression and human review.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('edit', type=Path); parser.add_argument('--movie', type=Path); parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    report = measure(json.loads(args.edit.read_text()), args.movie)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({k: report[k] for k in ('state', 'containerFramesMeasured', 'movieInspected')}))
    if report['errors']: raise SystemExit(1)


if __name__ == '__main__': main()
