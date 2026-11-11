"""Analyze a private user reference; never add it to the raw editing sources."""
import argparse
import json
import os
from pathlib import Path
import re
from media_intake import inspect
from media_evidence import measure


def analyze(folder, asset):
    if not re.fullmatch(r'[a-f0-9-]{36}', asset):
        raise ValueError('Identificador de referencia inválido.')
    target = folder / f'analysis-{asset}.json'

    def save(value):
        temporary = target.with_suffix('.tmp')
        temporary.write_text(json.dumps(value, ensure_ascii=False))
        temporary.replace(target)

    save({'state': 'running', 'pid': os.getpid()})
    try:
        measured = {}
        try:
            measured['evidence'] = measure(folder / asset, reference=True)
        except Exception:
            measured['measurementError'] = 'No se pudieron medir el movimiento y el sonido. El análisis visual sigue disponible.'
        report = inspect(folder / asset, sample_hints=measured.get('evidence', {}).get('picture', {}).get('strongChangeSeconds'))
        save({'state': 'ready', 'route': report['route'],
              'reason': report['analysis']['reason'], 'patterns': report['patterns'], **measured})
    except Exception:
        save({'state': 'failed', 'error': 'No se pudo analizar la referencia con Sol. Comprueba tu sesión de ChatGPT y vuelve a intentarlo.'})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder', type=Path)
    parser.add_argument('asset')
    args = parser.parse_args()
    analyze(args.folder, args.asset)
