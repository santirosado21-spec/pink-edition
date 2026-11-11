"""Crea una sesión sintética para probar el render real del motor en local.

Sólo genera medios sintéticos (ffmpeg lavfi) y una sesión temporal; nunca
usa medios del usuario, red externa ni inferencia. La sesión vive en el
directorio temporal del sistema y caduca con el barrido normal.

Uso:
  python3 scripts/dev_fullscreen_fixture.py
  # imprime la carpeta; luego, con `next start` en :3001:
  #   node scripts/test_editorial_fullscreen_render.mjs CARPETA http://localhost:3001 SALIDA

Notas de codificación aprendidas: el video debe ser pequeño y de lectura
fluida (baja resolución, sin B-frames, faststart); archivos grandes pueden
llegar incompletos al extractor cuando el proxy sirve despacio.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import uuid
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    root = Path(os.environ.get('TMPDIR', '/tmp')) / 'cutkind-upload-sessions' / \
        hashlib.sha256(str(ROOT).encode()).hexdigest()[:16]
    sid = str(uuid.uuid4())
    folder = root / sid
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error',
                    '-f', 'lavfi', '-i', 'testsrc2=size=540x960:rate=30:duration=5.5',
                    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=5.5',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-bf', '0', '-g', '15',
                    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-shortest',
                    str(folder / 'take1.mp4')], check=True)
    prefs = {"topic": "Fixture sintético", "language": "es", "brand_color": "#f36b52", "transition": "punch",
             "font": "cinema", "captions": "pink", "vibe": "balanced", "graphics": "none", "graphic_kinds": [],
             "support_media": "none", "emphasis_mode": "fullscreen", "sfx": "none", "sound_pack": "soft",
             "editorialFamilyId": "umbral",
             "editorial": {"version": 1, "presence": "balanced", "readingPace": "balanced",
                           "emphasisStyle": "overlay", "resourceStyle": "mixed", "framingStyle": "gentle",
                           "captionIntent": "both", "referenceAspects": []}}
    words = [{"text": t, "startMs": a, "endMs": b, "confidence": 1} for t, a, b in [
        ("hola", 500, 900), ("mundo", 950, 1300), ("esto", 2200, 2600), ("funciona", 2650, 3000),
        ("muy", 3100, 3400), ("bien", 3450, 3800), ("siempre", 3900, 4300), ("gracias", 4400, 4900)]]
    edit = {"editorialVersion": 1, "fps": 30, "width": 540, "height": 960, "frames": 165,
            "preferences": prefs,
            "scenes": [{"id": "s1", "name": "Toma sintética", "asset": "take1.mp4", "from": 0,
                        "frames": 165, "width": 540, "height": 960}],
            "captions": words, "beats": [], "music": None, "musicFrames": 1, "issues": [],
            "assets": [{"file": "take1.mp4", "source": "sintético ffmpeg", "author": "fixture local",
                        "license": "propio"}],
            "checks": {}}
    brief = {"version": 1, "objective": "Fixture de render", "audience": "nadie", "preferences": prefs,
             "musicMood": "none", "musicSource": "licensed-library", "brollSource": "licensed-library",
             "resourceNotes": "", "resourcePolicy": "relevant-only", "confirmed": True, "brandKitId": None}
    (folder / 'edit.json').write_text(json.dumps(edit))
    (folder / 'session.json').write_text(json.dumps(
        {"id": sid, "expiresAt": 9999999999999, "brief": brief, "state": "received"}))
    print(folder)


if __name__ == '__main__':
    sys.exit(main())
