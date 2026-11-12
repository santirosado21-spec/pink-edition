"""Run a bounded local experiment, archive evidence and retain each revision.

Example: python3 scripts/fran_loop.py --config work/fran-loop/config.json
New rounds use a new directory. Feedback goes in the config and in each brief.
This runs the real intake API and worker; it never overwrites source recordings.
Browser/aesthetic review remains separate from technical QC.
"""
import argparse
import hashlib
import html
import json
import pathlib
import shutil
import subprocess
import time
import urllib.parse
import urllib.request
from media_intake import inspect as inspect_media

ROOT = pathlib.Path(__file__).resolve().parents[1]


def validate_corpus_config(config):
    """Impide que una ronda generada desde el corpus mezcle dev y holdout."""
    videos = config.get('videos')
    if not isinstance(videos, list):
        raise ValueError('La configuración no contiene una lista de videos válida.')
    corpus_videos = [video for video in videos if isinstance(video, dict) and video.get('corpusSha256')]
    if not corpus_videos:
        return
    if len(corpus_videos) != len(videos):
        raise ValueError('Una ronda del corpus no puede mezclar clips del corpus y clips manuales.')
    splits = {video.get('split') for video in corpus_videos}
    if not splits <= {'dev', 'holdout'} or len(splits) != 1:
        raise ValueError('Una ronda del corpus debe usar un único split: dev o holdout.')
    hashes = [video.get('corpusSha256') for video in corpus_videos]
    if any(not isinstance(digest, str) or len(digest) != 64 for digest in hashes):
        raise ValueError('Una ronda del corpus requiere un sha256 válido por clip.')
    if len(set(hashes)) != len(hashes):
        raise ValueError('Una ronda del corpus no puede repetir el mismo clip.')


def sha256(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def save(file, data):
    file.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def request(origin, route, data=None, session=None, file=None):
    headers = {'Origin': origin}
    if session:
        headers['x-cutkind-session'] = session
    if file:
        body = file.read_bytes()
        headers['Content-Type'] = 'application/octet-stream'
        method = 'PUT'
    elif data is not None:
        body = json.dumps(data).encode()
        headers['Content-Type'] = 'application/json'
        method = 'POST'
    else:
        body, method = None, 'GET'
    req = urllib.request.Request(origin + route, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=180) as response:
        return json.load(response)


def wait(origin, session, limit):
    deadline, previous = time.monotonic() + limit, None
    while time.monotonic() < deadline:
        result = request(origin, '/api/local-intake/run', session=session)
        run = result.get('run') or {}
        stage = run.get('stage')
        if stage != previous:
            print(session, stage, flush=True)
            previous = stage
        if run.get('state') in ('ready', 'incomplete', 'failed', 'exported'):
            return result
        time.sleep(3)
    raise TimeoutError('La ejecución sigue activa; no se descartó la sesión ni se lanzó otra.')


def archive(folder, target):
    # Retain source/analysis/media/logs before the temporary-session sweeper runs.
    shutil.copytree(folder, target, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('bundle', '*.tmp', '*.lock', 'go'))


def preflight(item, target):
    paths = item.get('sources') or [item['source']]
    sources = [pathlib.Path(value).resolve(strict=True) for value in paths]
    if not sources or len(set(sources)) != len(sources):
        raise ValueError('Cada proyecto requiere tomas distintas en el orden original.')
    reports = [inspect_media(source) for source in sources]
    routes = {report['route'] for report in reports}
    role = 'edit' if routes == {'edit'} else 'reference' if routes == {'reference'} else 'review'
    value = {'role': role, 'sources': [{'path': str(source), **report} for source, report in zip(sources, reports)],
             'patterns': [pattern for report in reports for pattern in report['patterns']]}
    save(target / 'intake.json', value)
    return sources, value


def gallery(public, results):
    cards = []
    for i, entry in enumerate(results, 1):
        role = entry.get('role', 'edit')
        video = f'<video aria-label="Video {i}" controls preload="metadata" src="video-{i:02d}.mp4"></video>' if entry.get('previewUrl') and role == 'edit' else '<p>Sin MP4: revisar estado de ejecución.</p>'
        if role == 'reference':
            video = '<p>Material ya editado: referencia de aprendizaje. Excluido de las pruebas de edición.</p>'
            if entry.get('referenceUrl'):
                video += '<video aria-label="Referencia original" controls preload="metadata" src="' + html.escape(entry['referenceUrl'], quote=True) + '"></video>'
        elif role == 'review':
            video = '<p>Material dudoso o mezcla de crudo y editado: edición bloqueada hasta revisar.</p>'
        issues = ''.join('<li>' + html.escape(issue) + '</li>' for issue in entry.get('editorialIssues', []))
        if not issues:
            issues = '<li>Sin pendientes técnicos de edición. Falta la revisión estética.</li>' if entry.get('checks') and all(entry['checks'].values()) else '<li>Revisar el estado de ejecución.</li>'
        style = entry.get('style', {})
        summary = html.escape(f"{style.get('editorialFamilyId', '')} · {style.get('font', '')} · {entry.get('durationSeconds', '?')} s")
        if role != 'edit':
            summary = 'Origen clasificado antes de editar · evidencia visual guardada'
        title = html.escape(entry.get('title', f'Video {i}'))
        patterns = ''.join('<li>' + html.escape(p['name']) + ' · ' + ('Disponible para probar' if p['implementation'] == 'available' else 'Por implementar') + '</li>' for p in entry.get('patterns', []))
        if role in ('reference', 'review'):
            issues = '<li>Patrones candidatos; falta tu feedback sobre qué conservar.</li>' if role == 'reference' else '<li>Confirmar el tipo de material antes de editar.</li>'
        label = 'Referencia editada' if role == 'reference' else 'Revisión de origen' if role == 'review' else 'Borrador'
        cards.append(f'<article><h2>{title} · {label}</h2><p>{summary}</p>{video}<ul>{patterns}</ul><p>Pendientes del motor:</p><ul>{issues}</ul><details><summary>Controles técnicos y procedencia</summary><pre>{html.escape(json.dumps(entry, ensure_ascii=False, indent=2))}</pre></details></article>')
    document = ('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pruebas de video</title><style>body{font:17px system-ui;margin:32px auto;padding:0 20px;max-width:1100px;background:#111;color:#eee}video{width:360px;max-width:100%;max-height:75vh}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{margin:24px 0;padding:24px;border:1px solid #555;border-radius:16px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:20px}summary{cursor:pointer}h1{font-size:32px}</style><h1>Pruebas locales de video</h1><p>Dos direcciones de edición para comparar. Son borradores: aún tienen pendientes editoriales.</p><p>Para la siguiente ronda, dime en el chat el video, el segundo y lo que cambiarías: ritmo, tamaño del presentador, letra, subtítulos, música o recursos.</p><main>' + ''.join(cards) + '</main></html>')

    if any(row.get('role') in ('reference', 'review') for row in results):
        document = document.replace('Dos direcciones de edición para comparar. Son borradores: aún tienen pendientes editoriales.', 'Los editados se estudian como referencias; los dudosos se revisan antes de editar. Las adaptaciones se prueban sobre material crudo.')
    (public / 'index.html').write_text(document)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=pathlib.Path, required=True)
    parser.add_argument('--inspect-only', action='store_true', help='Clasificar y extraer referencias sin subir ni editar.')
    args = parser.parse_args()
    config = json.loads(args.config.read_text())
    if not isinstance(config.get('videos'), list) or not config['videos']:
        raise ValueError('Indica los proyectos candidatos; las referencias no cuentan como videos a editar.')
    validate_corpus_config(config)
    origin = config.get('origin', 'http://localhost:3001').rstrip('/')
    url = urllib.parse.urlparse(origin)
    if url.hostname not in ('localhost', '127.0.0.1', '::1') or url.scheme != 'http':
        raise ValueError('Las pruebas requieren un servidor HTTP local.')
    round_id = time.strftime('%Y%m%d-%H%M%S')
    output = ROOT / 'work/fran-loop' / round_id
    output.mkdir(parents=True, exist_ok=False)
    public = ROOT / 'public/work/fran-loop' / round_id
    public.mkdir(parents=True, exist_ok=False)
    save(output / 'config.json', config)
    results, plans = [], []
    # Classify the complete batch before the first upload or editing request.
    for index, item in enumerate(config['videos'], 1):
        target = output / f'video-{index:02d}'
        target.mkdir()
        sources, intake = preflight(item, target)
        plans.append((index, item, target, sources, intake))
        results.append({'title': item.get('title', f'Video {index}'), 'role': intake['role'],
                        'patterns': intake['patterns'], 'editorialIssues': [], 'checks': {},
                        'sourceDurationSeconds': sum(r['durationSeconds'] for r in intake['sources']),
                        'intakeReport': str(target / 'intake.json')})
        print('SOURCE', index, intake['role'], flush=True)
    save(output / 'results.json', results)
    gallery(public, results)
    target_count = config.get('targetRawProjects', 2)
    if type(target_count) is not int or target_count not in (1,2):raise ValueError('La ronda admite uno o dos proyectos crudos.')
    selected = [index for index, _, _, _, intake in plans if intake['role'] == 'edit'][:target_count]
    save(output / 'selection.json', {'targetRawProjects': target_count, 'selectedRawProjects': selected,
        'missingRawProjects': max(0, target_count-len(selected)),
        'referenceProjects': [index for index, _, _, _, intake in plans if intake['role'] == 'reference'],
        'reviewProjects': [index for index, _, _, _, intake in plans if intake['role'] == 'review']})
    if args.inspect_only:
        print('INTAKE', output, flush=True)
        return
    for index, item, target, sources, intake in plans:
        if index not in selected:
            continue
        digests = [report['sha256'] for report in intake['sources']]
        brief = item['brief']
        feedback = config.get('feedback', '')
        if feedback:
            brief = dict(brief, resourceNotes=(brief.get('resourceNotes', '') + '\nFeedback: ' + feedback)[:600])
        if item.get('sessionFolder'):
            folder = pathlib.Path(item['sessionFolder']).resolve(strict=True)
            session = folder.name
            current = request(origin, '/api/local-intake/run', session=session)
            if current['session']['brief'] != brief:
                raise ValueError('El brief archivado no coincide con la sesión existente.')
            if [s['sha256'] for s in current['session']['sources']] != digests:
                raise ValueError('La sesión existente no corresponde a la grabación elegida.')
        else:
            session = request(origin, '/api/local-intake', brief)['sessionId']
            order = []
            for source, digest in zip(sources, digests):
                receipt = request(origin, '/api/jobs/upload?name=' + urllib.parse.quote(source.name), session=session, file=source)
                if receipt['source']['sha256'] != digest:
                    raise ValueError('El original recibido difiere del archivo de entrada.')
                order.append(receipt['source']['id'])
            # The server owns session paths. Obtain the actual path using its established algorithm.
            import tempfile
            folder = pathlib.Path(tempfile.gettempdir()) / 'cutkind-upload-sessions' / hashlib.sha256(str(ROOT).encode()).hexdigest()[:16] / session
            if item.get('reuseAnalysisFrom'):
                previous = pathlib.Path(item['reuseAnalysisFrom']).resolve(strict=True)
                old_input = json.loads((previous/'input.json').read_text())
                voice_keys = ('language','brand_name','vocabulary')
                if any(old_input['brief']['preferences'].get(k) != brief['preferences'].get(k) for k in voice_keys):
                    raise ValueError('El caché ASR requiere el mismo idioma y vocabulario.')
                old_sources = {s['sha256']:s['id'] for s in old_input['sources']}
                (folder/'analysis').mkdir(exist_ok=True)
                receipts=[]
                for new_id, digest in zip(order,digests):
                    old_id=old_sources.get(digest)
                    if not old_id:continue
                    for suffix in ('.json','-orientation.json','-bounds-v3.json'):
                        source_file=previous/'analysis'/(old_id+suffix)
                        if source_file.exists():
                            shutil.copy2(source_file,folder/'analysis'/(new_id+suffix))
                            receipts.append({'sourceSha256':digest,'analysisSuffix':suffix})
                save(target/'reused-analysis.json',{'scope':'Exact-byte source hashes, same ASR language/vocabulary; director, resource selection, framing and render run again.','files':receipts})
            request(origin, '/api/local-intake/run', {'action': 'edit', 'order': order}, session)
        manifest = {'sources': [{'path': str(source), 'sha256': digest} for source, digest in zip(sources, digests)], 'session': session, 'brief': brief}
        if len(sources) == 1:
            manifest.update(manifest['sources'][0])
        save(target / 'source-manifest.json', manifest)
        result = wait(origin, session, config.get('timeoutSeconds', 3600))
        # A reused upload session may still hold a previous render. Preserve it
        # separately so no current review can mistake stale stills for this edit.
        if (folder / 'review').exists():
            shutil.move(str(folder / 'review'), str(target / 'previous-review'))
        archive(folder, target / 'session')
        edit = result.get('edit')
        qc = {'sourceUnchanged': all(sha256(source) == digest for source, digest in zip(sources, digests)),
              'role': 'edit', 'intakeReport': str(target / 'intake.json'),
              'title': item.get('title', f'Video {index}'), 'sourceCount': len(sources),
              'run': result['run'], 'editorialIssues': edit.get('issues', []) if edit else [],
              'checks': edit.get('checks', {}) if edit else {},
              'durationSeconds': round(edit['frames'] / edit['fps'], 2) if edit else None,
              'style': {key: brief['preferences'].get(key) for key in ('editorialFamilyId', 'font', 'vibe', 'captions')},
              'browserReview': 'pending', 'aestheticApproval': 'pending-user-feedback',
              'ai': edit.get('ai') if edit else None}
        if edit:
            # A review MP4 is explicitly a draft. It does not bypass the final-export gate.
            command = ['node', 'scripts/one_shot_review.mjs', str(folder), origin, '--video']
            with (target / 'render.log').open('w') as log:
                completed = subprocess.run(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, timeout=3600)
            qc['reviewRenderExitCode'] = completed.returncode
            preview = folder / 'review/preview.mp4'
            if completed.returncode == 0 and preview.exists():
                dest = public / f'video-{index:02d}.mp4'
                shutil.copy2(preview, dest)
                qc['previewUrl'] = origin + '/work/fran-loop/' + round_id + '/' + dest.name
                qc['previewPath'] = str(target / 'session/review/preview.mp4')
                audio = subprocess.run([str(ROOT / '.venv-asr/bin/python'), 'scripts/check_one_shot_audio.py', str(folder), str(preview)], cwd=ROOT, capture_output=True, text=True, timeout=180)
                qc['audioQc'] = {'exitCode': audio.returncode, 'output': (audio.stdout + audio.stderr)[-4000:]}
                full_voice = subprocess.run([str(ROOT / '.venv-asr/bin/python'), 'scripts/check_full_voice.py', str(folder), str(preview)], cwd=ROOT, capture_output=True, text=True, timeout=300)
                qc['fullVoiceQc'] = {'exitCode': full_voice.returncode, 'output': (full_voice.stdout + full_voice.stderr)[-6000:], 'scope': 'Waveform continuity; semantic listening and human approval remain pending.'}
                visual = subprocess.run(['python3','scripts/review_render_with_sol.py',str(folder),str(preview)],cwd=ROOT,capture_output=True,text=True,timeout=420)
                qc['visualModelReview']={'exitCode':visual.returncode,'output':(visual.stdout+visual.stderr)[-2000:],'humanApproval':'pending'}
            archive(folder, target / 'session')
        save(target / 'quality.json', qc)
        save(target / 'feedback.json', {'status': 'pending', 'comments': [], 'nextRoundChanges': []})
        results[index-1] = qc
        save(output / 'results.json', results)
        gallery(public, results)
        print('ARCHIVED', target, flush=True)
    print('REVIEW', origin + '/work/fran-loop/' + round_id + '/index.html', flush=True)


if __name__ == '__main__':
    main()
