#!/usr/bin/env python3
"""Loop de terminal: puertas técnicas -> estado de la última ronda -> tu veredicto -> siguiente ronda.

  python3 scripts/pink_loop.py              # loop interactivo (menú)
  python3 scripts/pink_loop.py gates        # typecheck + pruebas rápidas
  python3 scripts/pink_loop.py status       # tablero de la última ronda y pendientes
  python3 scripts/pink_loop.py review       # puntúas cada video (1-5) y dejas comentarios
  python3 scripts/pink_loop.py next         # genera la config de la siguiente ronda con tu feedback
  python3 scripts/pink_loop.py run --yes    # lanza la ronda (usa fran_loop.py; ver aviso abajo)

Lo técnico (gates, QC) y lo estético (tu veredicto) se guardan por separado: un MP4 con QC en
verde nunca figura como «aprobado» hasta que tú lo puntúas. Nada se envía fuera del Mac salvo en
`run`, que usa el flujo real (Whisper local; texto y fotogramas a Sol/ChatGPT) y exige --yes.
Estado propio: work/pink-loop/ (ledger.jsonl, next-config.json). No toca originales ni rondas viejas.
"""
import argparse
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
ROUNDS = pathlib.Path(os.environ.get('PINK_LOOP_ROUNDS', ROOT / 'work/fran-loop'))
STATE = pathlib.Path(os.environ.get('PINK_LOOP_STATE', ROOT / 'work/pink-loop'))
LEDGER = STATE / 'ledger.jsonl'
PY = str(ROOT / '.venv/bin/python') if (ROOT / '.venv/bin/python').exists() else sys.executable

GATES = [
    ('typecheck', ['npm', 'run', '--silent', 'typecheck']),
    ('cobertura de tomas', [PY, 'scripts/test_source_coverage.py']),
    ('cortes de habla', [PY, 'scripts/test_speech_cuts.py']),
    ('recetas editoriales', [PY, 'scripts/test_editorial_recipes.py']),
    ('controles editoriales', [PY, 'scripts/test_editorial_controls.py']),
    ('personalización (py)', [PY, 'scripts/test_personalization_contract.py']),
    ('personalización (js)', ['node', 'scripts/test_personalization_contract.mjs']),
    ('paso editorial', ['node', 'scripts/test_editorial_step.mjs']),
    ('política de recursos', ['node', 'scripts/test_resource_policy.mjs']),
    ('catálogo de marca', ['node', 'scripts/test_brand_catalog.mjs']),
]
DIMENSIONS = [('claridad', 'se lee y se entiende'), ('pertinencia', 'tarjetas/B-roll vienen al caso'),
              ('ritmo', 'cortes y énfasis'), ('estilo', 'fiel al preset elegido'),
              ('publicable', 'lo publicarías tal cual')]
FEEDBACK_LIMIT = 500  # fran_loop recorta resourceNotes a 600 caracteres


def load(path, default=None):
    try:
        return json.loads(pathlib.Path(path).read_text())
    except (OSError, ValueError):
        return default


def save(path, data):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def ask(prompt, default=''):
    try:
        value = input(prompt).strip()
    except EOFError:
        raise SystemExit('\nSin entrada interactiva; usa un subcomando no interactivo.')
    return value or default


def rounds():
    """Rondas que tienen al menos un video con quality.json, más recientes primero."""
    found = [d for d in ROUNDS.iterdir() if d.is_dir() and list(d.glob('video-*/quality.json'))] if ROUNDS.exists() else []
    return sorted(found, key=lambda d: d.stat().st_mtime, reverse=True)


def pick_round(name):
    if name:
        folder = ROUNDS / name
        if not folder.is_dir():
            raise SystemExit(f'No existe la ronda {name}.')
        return folder
    found = rounds()
    if not found:
        raise SystemExit('No hay rondas con resultados en work/fran-loop. Lanza una con `run --yes`.')
    return found[0]


def gates(only_failed=False):
    print('PUERTAS TÉCNICAS (sin red, sin gasto)')
    results = []
    for name, cmd in GATES:
        start = time.monotonic()
        done = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        ok = done.returncode == 0
        results.append({'gate': name, 'ok': ok})
        print(f"  {'OK  ' if ok else 'FALLA'} {name} ({time.monotonic() - start:.1f}s)")
        if not ok:
            print('        ' + '\n        '.join((done.stdout + done.stderr).strip().splitlines()[-6:]))
    failed = [r['gate'] for r in results if not r['ok']]
    append({'event': 'gates', 'failed': failed, 'total': len(results)})
    print(f"  => {len(results) - len(failed)}/{len(results)} en verde" + (f"; falla: {', '.join(failed)}" if failed else ''))
    return not failed


def append(entry):
    STATE.mkdir(parents=True, exist_ok=True)
    with LEDGER.open('a') as stream:
        stream.write(json.dumps({'at': time.strftime('%Y-%m-%dT%H:%M:%S'), **entry}, ensure_ascii=False) + '\n')


def video_rows(folder):
    for quality in sorted(folder.glob('video-*/quality.json')):
        q = load(quality, {})
        feedback = load(quality.parent / 'feedback.json', {})
        checks = q.get('checks') or {}
        failing = [k for k, v in checks.items() if v is not True] if isinstance(checks, dict) else ['checks sin formato']
        qc = {'audio': (q.get('audioQc') or {}).get('exitCode'), 'voz completa': (q.get('fullVoiceQc') or {}).get('exitCode'),
              'revisión visual (modelo)': (q.get('visualModelReview') or {}).get('exitCode')}
        yield quality.parent, q, feedback, failing, qc


def status(name=None):
    folder = pick_round(name)
    print(f'RONDA {folder.name}')
    pending = []
    for target, q, feedback, failing, qc in video_rows(folder):
        title = q.get('title') or target.name
        technical = 'técnico OK' if not failing and not q.get('editorialIssues') and all(v in (0, None) for v in qc.values()) else 'técnico con pendientes'
        scores = feedback.get('scores')
        human = f"tu nota media {sum(scores.values()) / len(scores):.1f}/5" if scores else 'SIN VEREDICTO TUYO'
        print(f"  - {title} · {q.get('durationSeconds')} s · {technical} · {human}")
        for k in failing:
            print(f'      check en rojo: {k}')
            pending.append(f'{title}: arreglar check «{k}»')
        for issue in q.get('editorialIssues') or []:
            print(f'      pendiente del motor: {issue}')
            pending.append(f'{title}: {issue}')
        for label, code in qc.items():
            if code is None:
                print(f'      sin ejecutar: {label}')
                pending.append(f'{title}: ejecutar {label}')
            elif code != 0:
                print(f'      FALLÓ: {label} (código {code})')
                pending.append(f'{title}: corregir {label}')
        if not scores:
            pending.append(f'{title}: puntuarlo (`review`)')
        elif min(scores.values()) <= 2:
            low = [k for k, v in scores.items() if v <= 2]
            pending.append(f"{title}: mejorar {', '.join(low)} (nota ≤2)")
        for change in feedback.get('nextRoundChanges') or []:
            pending.append(f'{title}: {change}')
    print('\nPENDIENTES, por orden de acción:')
    for i, item in enumerate(pending, 1) if pending else []:
        print(f'  {i}. {item}')
    if not pending:
        print('  Ninguno. Si te convence, es candidato a entrega; si no, dilo en `review`.')
    return pending


def review(name=None):
    folder = pick_round(name)
    print(f'REVIEW de {folder.name}. Abre el MP4 (work/fran-loop/{folder.name}/video-XX/session/review/preview.mp4) y puntúa 1-5.')
    for target, q, feedback, _, _ in video_rows(folder):
        print(f"\n== {q.get('title') or target.name} ({q.get('durationSeconds')} s)")
        if feedback.get('scores') and ask('  Ya tiene veredicto. ¿Rehacer? [s/N] ').lower() != 's':
            continue
        scores = {}
        for key, hint in DIMENSIONS:
            while True:
                value = ask(f'  {key} ({hint}) 1-5: ')
                if value in list('12345'):
                    scores[key] = int(value)
                    break
        comment = ask('  Qué cambiarías (video, segundo, qué): ')
        changes = [comment] if comment else []
        record = {'status': 'reviewed', 'scores': scores, 'comments': changes, 'nextRoundChanges': changes,
                  'reviewedAt': time.strftime('%Y-%m-%dT%H:%M:%S')}
        save(target / 'feedback.json', record)
        q['aestheticApproval'] = 'approved' if min(scores.values()) >= 4 else 'needs-changes'
        save(target / 'quality.json', q)
        append({'event': 'review', 'round': folder.name, 'video': target.name, 'title': q.get('title'), **record})
        print(f"  guardado: {q['aestheticApproval']}")


def next_config(name=None):
    folder = pick_round(name)
    config = load(folder / 'config.json')
    if not config:
        raise SystemExit('La ronda no conserva config.json; no puedo derivar la siguiente.')
    notes = []
    for target, q, feedback, _, _ in video_rows(folder):
        scores = feedback.get('scores') or {}
        low = [k for k, v in scores.items() if v <= 3]
        parts = [c for c in feedback.get('nextRoundChanges') or [] if c]
        if low:
            parts.append('mejorar: ' + ', '.join(low))
        if parts:
            notes.append(f"{q.get('title') or target.name}: " + '; '.join(parts))
    if not notes:
        raise SystemExit('No hay feedback que trasladar. Ejecuta `review` primero (o aprueba la ronda).')
    feedback_text = (' | '.join(notes))[:FEEDBACK_LIMIT]
    config['feedback'] = feedback_text
    for video in config.get('videos', []):
        video.pop('sessionFolder', None)  # sesión nueva; reutiliza el análisis de voz en lugar de repetirlo
        old = next((t for t in sorted(folder.glob('video-*')) if (t / 'session/analysis').exists()), None)
        if old and not video.get('reuseAnalysisFrom'):
            video['reuseAnalysisFrom'] = str(old / 'session')
    save(STATE / 'next-config.json', config)
    append({'event': 'next-config', 'from': folder.name, 'feedback': feedback_text})
    print(f'Config lista: {STATE / "next-config.json"}\nFeedback incluido ({len(feedback_text)} car.): {feedback_text}')
    return STATE / 'next-config.json'


def server_up(origin):
    try:
        urllib.request.urlopen(origin + '/api/jobs', timeout=3)
        return True
    except Exception:
        return False


def run(config_path, yes):
    config = load(config_path)
    if not config:
        raise SystemExit(f'No puedo leer {config_path}.')
    origin = config.get('origin', 'http://localhost:3001')
    if not yes:
        print('`run` ejecuta el flujo real: Whisper y render locales, pero el texto y los fotogramas '
              'seleccionados viajan a Sol (ChatGPT/Codex). Repite con --yes para autorizarlo.')
        return 2
    if not server_up(origin):
        print(f'El servidor no responde en {origin}. Arráncalo (next start/dev en el puerto indicado) y repite.')
        return 2
    append({'event': 'run', 'config': str(config_path)})
    return subprocess.run([PY, 'scripts/fran_loop.py', '--config', str(config_path)], cwd=ROOT).returncode


def loop():
    print('LOOP Pink.ai — Ctrl+C para salir. Cada vuelta: gates -> estado -> tu veredicto -> siguiente ronda.\n')
    while True:
        green = gates()
        print()
        try:
            pending = status()
        except SystemExit as stop:
            print(stop)
            pending = []
        print(f"\nQué sigue: {'[gates en rojo: arréglalos primero] ' if not green else ''}"
              '[r]eview  [n]ext (config)  [l]anzar ronda  [g]ates otra vez  [s]alir')
        choice = ask('> ', 's').lower()
        if choice == 'r':
            review()
        elif choice == 'n':
            next_config()
        elif choice == 'l':
            path = STATE / 'next-config.json'
            if not path.exists():
                print('Aún no hay next-config.json: usa [n] antes.')
            elif ask(f'¿Lanzar con {path}? Envía texto/fotogramas a Sol. [s/N] ').lower() == 's':
                run(path, True)
        elif choice == 's':
            return
        print('\n' + '-' * 60 + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='cmd')
    for name in ('status', 'review', 'next'):
        sub.add_parser(name).add_argument('round', nargs='?', help='nombre de ronda; por defecto la última')
    sub.add_parser('gates')
    runner = sub.add_parser('run')
    runner.add_argument('--config', type=pathlib.Path, default=STATE / 'next-config.json')
    runner.add_argument('--yes', action='store_true', help='autoriza el envío a Sol y el gasto de cómputo')
    sub.add_parser('loop')
    args = parser.parse_args()
    cmd = args.cmd or 'loop'
    if cmd == 'gates':
        sys.exit(0 if gates() else 1)
    elif cmd == 'status':
        sys.exit(1 if status(args.round) else 0)
    elif cmd == 'review':
        review(args.round)
    elif cmd == 'next':
        next_config(args.round)
    elif cmd == 'run':
        sys.exit(run(args.config, args.yes))
    else:
        loop()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print()
