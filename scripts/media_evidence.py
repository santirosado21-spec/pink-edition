"""Local, model-free evidence for references and rendered MP4s.

Adapted concepts/algorithms: reanimate activity curves, video-director adjacent
frame flash detection, earshot RMS envelopes. See third_party/media-evidence.
No semantic audio labels, aesthetic score, automatic cuts or remote calls.
"""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys
import tempfile

def _sha256_stream(stream):
    if hasattr(hashlib, 'file_digest'):
        return _sha256_stream(stream)
    digest = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1 << 20), b''):
        digest.update(chunk)
    return digest.hexdigest()



VERSION = 1


def run(args, **kwargs):
    return subprocess.run(args, check=True, stderr=subprocess.PIPE, timeout=240, **kwargs)


def delta(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)


def picture(frames, fps):
    """Bounded memory; adjacent-frame evidence, not recognition of shot contents."""
    previous = before_previous = None
    differences, activities, flashes = [], [], []
    first_dark = False
    for index, frame in enumerate(frames):
        if not frame:
            raise ValueError('Empty frame')
        if previous is None:
            first_dark = sum(frame) / len(frame) < 8
            difference, activity = 0.0, 0.0
        else:
            difference = delta(frame, previous)
            activity = sum(abs(x - y) > 12 for x, y in zip(frame, previous)) / len(frame)
        # video-director: a spike on both sides whose surrounding frames agree.
        if before_previous is not None:
            floor = max(12.0, 4 * statistics.median(differences[-30:]))
            if differences[-1] > floor and difference > floor and delta(frame, before_previous) < .35 * min(difference, differences[-1]):
                flashes.append(round((index - 1) / fps, 3))
        differences.append(difference)
        activities.append(activity)
        before_previous, previous = previous, frame
    if len(differences) < 2:
        raise ValueError('Not enough decoded frames')
    # A change can be a cut, camera movement or lighting: never call it a cut count.
    strongest = []
    for i in sorted(range(1, len(differences)), key=lambda i: differences[i], reverse=True):
        if differences[i] < 6:
            break
        if all(abs(i / fps - t) >= .5 for t in strongest):
            strongest.append(round(i / fps, 3))
        if len(strongest) == 8:
            break
    stride = max(1, math.ceil(len(activities) / 240))
    return {'sampleFps': fps, 'decodedFrames': len(differences),
            'firstFrameDark': first_dark, 'flashSeconds': flashes[:100],
            'strongChangeSeconds': sorted(strongest),
            'meanActivity': round(statistics.mean(activities[1:]), 4),
            'activity': [{'seconds': round(i / fps, 3), 'value': round(max(activities[i:i + stride]), 4)}
                         for i in range(0, len(activities), stride)]}


def audio_envelope(stream, sample_rate=24000, channels=2):
    """Earshot-style 100 ms RMS; channel energy avoids anti-phase cancellation."""
    window = sample_rate // 10 * channels
    levels, peaks, counts = [], [], []
    while raw := stream.read(window * 4):
        if len(raw) % 4:
            raise ValueError('Truncated audio')
        samples = array('f', raw)
        if sys.byteorder != 'little':
            samples.byteswap()
        if any(not math.isfinite(x) for x in samples):
            raise ValueError('Non-finite audio')
        peaks.append(max(abs(x) for x in samples))
        levels.append(20 * math.log10(max(1e-6, math.sqrt(sum(x*x for x in samples) / len(samples)))))
        counts.append(len(samples))
    if not levels:
        raise ValueError('Empty audio stream')
    return {'present': True, 'windowSeconds': .1,
            'peakDbfs': round(20 * math.log10(max(1e-6, max(peaks))), 2),
            'loudestSeconds': round(levels.index(max(levels)) / 10, 3),
            'quietFraction': round(sum(n for n, level in zip(counts, levels) if level < -50) / sum(counts), 4),
            'decodedSeconds': sum(counts) / (sample_rate * channels)}


def measure(source, *, reference=False):
    source = Path(source).resolve(strict=True)
    probe = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(source)], stdout=subprocess.PIPE).stdout)
    video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    duration = float(probe['format']['duration'])
    if not math.isfinite(duration) or not 0 < duration <= 1800:
        raise ValueError('Duration outside the 30 minute analysis limit')
    numerator, denominator = map(float, video['avg_frame_rate'].split('/'))
    native_fps = numerator / denominator
    if not math.isfinite(native_fps) or native_fps <= 0:
        raise ValueError('Invalid frame rate')
    fps = min(native_fps, 6 if reference else 60)
    scale = 64 / max(video['width'], video['height'])
    width, height = max(2, round(video['width'] * scale)), max(2, round(video['height'] * scale))
    with tempfile.TemporaryFile() as raw:
        run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(source), '-map', '0:v:0', '-an',
             '-vf', f'fps={fps},scale={width}:{height}:flags=area,format=gray', '-f', 'rawvideo', '-'], stdout=raw)
        raw.seek(0)
        def frames():
            while block := raw.read(width * height):
                if len(block) != width * height:
                    raise ValueError('Truncated frame')
                yield block
        visual = picture(frames(), fps)
    audio = {'present': False}
    if any(s['codec_type'] == 'audio' for s in probe['streams']):
        with tempfile.TemporaryFile() as raw:
            run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(source), '-map', '0:a:0', '-vn',
                 '-ac', '2', '-ar', '24000', '-f', 'f32le', '-'], stdout=raw)
            raw.seek(0)
            audio = audio_envelope(raw)
        meter = run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(source), '-map', '0:a:0', '-vn',
                     '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], stdout=subprocess.DEVNULL)
        log = meter.stderr.decode(errors='replace')
        values = json.JSONDecoder().raw_decode(log[log.rfind('{'):])[0]
        for name, key in [('integratedLufs', 'input_i'), ('truePeakDbtp', 'input_tp')]:
            value = float(values[key])
            audio[name] = round(value, 2) if math.isfinite(value) else None
    with source.open('rb') as stream:
        sha = _sha256_stream(stream)
    return {'version': VERSION, 'sourceSha256': sha, 'durationSeconds': duration,
            'picture': visual, 'audio': audio,
            'scope': 'Measured frame changes and audio levels only; no music/SFX recognition or aesthetic approval.'}


def assess(evidence, expected_seconds):
    errors, warnings = [], []
    if abs(evidence['durationSeconds'] - expected_seconds) > .2:
        errors.append({'message': 'La duración no coincide con la edición.'})
    visual, audio = evidence['picture'], evidence['audio']
    if not audio['present'] or audio['peakDbfs'] < -80:
        errors.append({'message': 'El MP4 no contiene audio audible.'})
    if abs(visual['decodedFrames'] / visual['sampleFps'] - expected_seconds) > max(.2, 2 / visual['sampleFps']):
        errors.append({'message': 'La imagen decodificada no cubre la duración esperada.'})
    if visual['firstFrameDark']:
        warnings.append({'seconds': 0, 'message': 'El primer cuadro es muy oscuro; revisa si es intencional.'})
    for seconds in visual['flashSeconds'][:8]:
        warnings.append({'seconds': seconds, 'message': 'Cambio breve de brillo; revisa este instante.'})
    if audio.get('truePeakDbtp') is not None and audio['truePeakDbtp'] > -1:
        warnings.append({'message': 'El audio tiene picos con poco margen; conviene escucharlo.'})
    if audio.get('integratedLufs') is not None and audio['integratedLufs'] < -24:
        warnings.append({'message': 'El nivel de audio es bajo; comprueba la voz.'})
    return {'state': 'fail' if errors else 'review' if warnings else 'pass', 'errors': errors, 'warnings': warnings,
            'audio': audio, 'sampleFps': visual['sampleFps']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--expected-seconds', type=float)
    parser.add_argument('--reference', action='store_true')
    args = parser.parse_args()
    result = measure(args.source, reference=args.reference)
    if args.expected_seconds is not None:
        result['review'] = assess(result, args.expected_seconds)
    temporary = args.out.with_suffix('.tmp')
    temporary.write_text(json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2))
    temporary.replace(args.out)
    if result.get('review', {}).get('state') == 'fail':
        raise SystemExit(1)
