"""Edita un video de punta a punta: del archivo original al MP4 con QC."""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

from plan_io import check_plan, empty_plan, load_plan, save_plan, snapshot_heads, read_preferences_file, require_preferences

PROJECT = Path(__file__).resolve().parents[1]
SCRIPTS = PROJECT / "scripts"
# WhisperX fija su propio torch; el recorte usa otro entorno (README).
ASR_PYTHON = os.environ.get("PINK_ASR_PYTHON", str(PROJECT / ".venv-asr/bin/python"))
TOOLS_PYTHON = os.environ.get("PINK_TOOLS_PYTHON", str(PROJECT / ".venv/bin/python"))


def run(arguments):
    print("→", " ".join(str(a) for a in arguments[:4]), "…", flush=True)
    subprocess.run([str(a) for a in arguments], check=True, cwd=PROJECT)


def write_status(work, state, stage, error=None):
    """Lo lee la web para mostrar en qué paso va el trabajo."""
    (work / "status.json").write_text(json.dumps(
        {"state": state, "stage": stage, "error": error, "pid": os.getpid(),
         "updated_at": time.time()}, ensure_ascii=False), encoding="utf-8")


def probe(path):
    data = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=codec_name,r_frame_rate,avg_frame_rate,pix_fmt", "-of", "json",
         str(path)], check=True, text=True, capture_output=True).stdout)
    return data["streams"][0]


def probe_geometry(source):
    """Dimensiones del primer stream de video, con la rotación si ffprobe la ofrece."""
    def run(entries):
        return subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
             entries, "-of", "json", str(source)], check=False, text=True, capture_output=True)
    # ffprobe < 5 no conoce la sección stream_side_data: se reintenta sin ella.
    result = run("stream=width,height:stream_side_data=rotation")
    if result.returncode != 0 and "side_data" in result.stderr:
        result = run("stream=width,height")
    if result.returncode != 0:
        raise SystemExit(f"ffprobe no pudo leer el video: {result.stderr.strip()}")
    return json.loads(result.stdout)["streams"][0]


def check_limits(source, style):
    """Un video horizontal o más largo que el máximo se rechaza antes de gastar cómputo."""
    video = probe_geometry(source)
    width, height = video["width"], video["height"]
    # Los celulares guardan el giro aparte: cuenta cómo se ve, no cómo está almacenado.
    if any(abs(int(data.get("rotation", 0))) % 180 == 90 for data in video.get("side_data_list", [])):
        width, height = height, width
    if width > height:
        raise SystemExit("El video es horizontal. Pink.ai edita videos verticales (9:16).")
    seconds = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
         "default=nw=1:nk=1", str(source)], check=True, text=True,
        capture_output=True).stdout)
    maximum = style["limits"]["max_seconds"]
    if seconds > maximum:
        raise SystemExit(f"El video dura {seconds:.0f} s y el máximo es {maximum} s.")


def conform(source, target, fps):
    """El motor cuenta en frames: el fuente debe ir a la cadencia del estilo."""
    if target.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    video = probe(source)
    rate = f"{fps}/1"
    if (video["codec_name"] == "h264" and video["pix_fmt"] == "yuv420p"
            and video["r_frame_rate"] == rate and video["avg_frame_rate"] == rate):
        shutil.copyfile(source, target)
        return
    run(["ffmpeg", "-v", "error", "-n", "-i", source, "-vf", f"fps={fps}",
         "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", target])


def parse():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--id", help="Nombre del trabajo; por defecto, el del archivo.")
    parser.add_argument("--style", type=Path, default=PROJECT / "style/pink-demo-v1.json")
    parser.add_argument("--plan", type=Path,
                        help="Plan de edición; sin él se usa uno vacío (sólo captions).")
    parser.add_argument("--timeline-from", type=Path,
                        help="Render con este montaje ya preparado (el de la versión del plan): "
                             "no se transcribe ni se corta otra vez.")
    parser.add_argument("--preferences", type=Path,
                        help="Gustos del creador (JSON); se copian al plan inicial.")
    parser.add_argument("--language", choices=["es", "en", "mixed", "auto"])
    parser.add_argument("--model", help="Modelo de transcripción; turbo por defecto. small consume menos recursos.")
    parser.add_argument("--allow-model-download", action="store_true")
    parser.add_argument("--skip-matte", action="store_true",
                        help="Sin recorte de la persona ni tarjetas detrás de ella.")
    parser.add_argument("--prepare-only", action="store_true",
                        help="Deja el video listo para editar, sin renderizar.")
    parser.add_argument("--execution-id", help="UUID de render aislado; requiere plan y timeline congelados.")
    parser.add_argument("--review", action="store_true",
                        help="Genera además los frames de revisión.")
    args = parser.parse_args()
    args.job = args.id or re.sub(r"[^a-z0-9]+", "-", args.source.stem.lower()).strip("-")
    if args.execution_id and (not re.fullmatch(r"[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}", args.execution_id)
                              or not args.plan or not args.timeline_from or args.prepare_only):
        parser.error("execution-id requiere UUID, plan y timeline, sin prepare-only")
    return args


def render_output(args, work, stage, plan, timeline, source, person, style):
    job = args.job
    plan_path = work / "plan.json"
    props = work / "props.json"
    props.write_text(json.dumps({
        "style": style, "plan": plan,
        "timeline": json.loads(timeline.read_text(encoding="utf-8")),
        "media": {"source": f"work/{job}/source.mp4",
                  "person": f"work/{job}/person.webm" if person.exists() else None},
    }, ensure_ascii=False), encoding="utf-8")
    if args.prepare_only:
        return
    stage("render")
    render, final = work / "out/render.mp4", work / f"out/{job}.mp4"
    for stale in (render, final):
        stale.unlink(missing_ok=True)
    run(["npx", "remotion", "render", "PinkEdit", render, f"--props={props}",
         "--codec=h264", "--audio-codec=aac", "--crf=18", "--timeout=120000",
         f"--concurrency={min(3, os.cpu_count() or 1)}"])
    stage("finish")
    run([TOOLS_PYTHON, SCRIPTS / "finish_full_demo.py", "--input", render,
         "--output", final, "--timeline", timeline, "--style", args.style,
         "--plan", plan_path, "--qc-prefix", "QC", "--report-dir", work / "out"])
    if args.review:
        run([TOOLS_PYTHON, SCRIPTS / "review_frames.py", "--style", args.style,
             "--plan", plan_path, "--timeline", timeline, "--props", props,
             "--out", work / "review"])
    print(f"Listo: {final}", flush=True)



def main(args, work, stage):
    job = args.job
    media = PROJECT / "public/work" / job
    style = json.loads(args.style.read_text(encoding="utf-8"))
    source = media / "source.mp4"
    person = media / "person.webm"
    transcript, timeline = work / "transcript.json", work / "timeline.json"
    plan_path = work / "plan.json"
    if args.execution_id:
        # Exportar el snapshot aprobado sin reproponer, recortar ni recolocar.
        if not source.exists():
            raise ValueError("Falta el original preparado para este render.")
        plan = load_plan(args.plan)
        frozen_timeline = json.loads(args.timeline_from.read_text())
        errors = check_plan(plan, frozen_timeline)
        if errors:
            raise ValueError("El snapshot no es válido: " + " ".join(errors[:3]))
        if plan["cards"] and not person.exists():
            raise ValueError("Falta el recorte de la persona para este snapshot.")
        save_plan(plan_path, plan)
        timeline.write_text(json.dumps(frozen_timeline, ensure_ascii=False))
        render_output(args, work, stage, plan, timeline, source, person, style)
        return
    if (work / "active-edit.json").exists():
        raise ValueError("Este trabajo tiene versiones del editor. Exporta desde la web para usar su snapshot activo; no se modificó la edición.")
    downloads = ["--allow-model-download"] if args.allow_model_download else []
    # Validar una ruta solicitada aunque el video ya tenga su propio snapshot.
    requested_preferences = read_preferences_file(args.preferences) if args.preferences else None
    try:
        stored_plan = load_plan(args.plan or plan_path)
    except FileNotFoundError:
        if args.plan:
            raise
        stored_plan = None
    else:
        if not isinstance(stored_plan, dict):
            raise ValueError("El plan guardado no es válido.")
    if stored_plan is None:
        preferences = requested_preferences or {}
    else:
        preferences = require_preferences(stored_plan["preferences"]) if "preferences" in stored_plan else {}
    args.language = args.language or preferences.get("language", "mixed")
    args.model = args.model or "turbo"

    stage("conform")
    check_limits(args.source.resolve(), style)
    conform(args.source.resolve(), source, style["fps"])
    if not (media / "poster.jpg").exists():
        run(["ffmpeg", "-v", "error", "-y", "-ss", "1", "-i", source, "-frames:v", "1",
             "-vf", "scale=360:-2", media / "poster.jpg"])
    stage("transcribe")
    if not transcript.exists() and not args.timeline_from:
        run([ASR_PYTHON, SCRIPTS / "transcribe.py", "--source", source,
             "--output", transcript, "--language", args.language,
             "--model", args.model, "--vocabulary", ", ".join(filter(None, [preferences.get("brand_name"), preferences.get("vocabulary")])), *downloads])
    if args.plan:
        save_plan(plan_path, stored_plan)
    elif stored_plan is None:
        save_plan(plan_path, empty_plan(style["id"], requested_preferences))
    stage("cut")
    # La etapa de corte reescribe el timeline sin cabezas: se guardan antes para reutilizarlas.
    previous_heads = work / "heads-previous.json"
    if args.timeline_from:
        # El montaje con que se vio la vista previa: tomas, palabras y cabezas tal cual.
        stored = json.loads(args.timeline_from.read_text(encoding="utf-8"))
        frames = int(float(subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
             "default=nw=1:nk=1", str(source)], check=True, text=True,
            capture_output=True).stdout) * style["fps"])
        if any(clip["source_in_frame"] + clip["duration_frames"] > frames + 1 for clip in stored["clips"]):
            raise SystemExit("El montaje guardado no corresponde a este video.")
        timeline.write_text(json.dumps(stored, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        snapshot_heads(timeline, previous_heads)
    else:
        snapshot_heads(timeline, previous_heads)
        run([ASR_PYTHON, SCRIPTS / "prepare_full_demo.py", "--source", source,
             "--transcript", transcript, "--timeline", timeline, "--out-dir", work,
             "--style", args.style, "--plan", plan_path,
             "--corrections", work / "corrections.json",
             "--word-prefix", f"{job}.word.", "--language", args.language, *downloads])
    # Un plan con palabras que no existen no debe llegar al recorte ni al render.
    problems = check_plan(load_plan(plan_path), json.loads(timeline.read_text(encoding="utf-8")))
    if problems:
        raise SystemExit("El plan no es válido: " + " ".join(problems[:3]))
    stage("matte")
    if not args.skip_matte and not person.exists():
        run([TOOLS_PYTHON, SCRIPTS / "make_matte.py", "--source", source,
             "--output", person])
    if person.exists():
        # Caja de la cabeza por toma: encuadra zooms y transiciones (y la vista previa).
        run([TOOLS_PYTHON, SCRIPTS / "heads.py", "--timeline", timeline, "--person", person,
             "--style", args.style, "--previous", previous_heads])
    stage("place")
    plan = load_plan(plan_path)
    run([TOOLS_PYTHON, SCRIPTS / "layout_captions.py", "--timeline", timeline, "--plan", plan_path, "--style", args.style])
    if plan["cards"]:
        if not person.exists():
            raise SystemExit("El plan tiene tarjetas: hace falta el recorte de la persona.")
        run([TOOLS_PYTHON, SCRIPTS / "place_graphics.py", "--style", args.style,
             "--plan", plan_path, "--timeline", timeline, "--person", person])
        plan = load_plan(plan_path)

    render_output(args, work, stage, plan, timeline, source, person, style)


if __name__ == "__main__":
    if sys.version_info < (3, 10):
        raise SystemExit("Requiere Python 3.10 o posterior.")
    arguments = parse()
    status_folder = PROJECT / "work" / arguments.job
    folder = status_folder / "renders" / arguments.execution_id if arguments.execution_id else status_folder
    (folder / "out").mkdir(parents=True, exist_ok=True)
    current = {"stage": "start"}

    def enter(name):
        current["stage"] = name
        write_status(status_folder, "running", name)

    try:
        enter("start")
        main(arguments, folder, enter)
    except BaseException as error:
        # El usuario ve este texto: un paso que falló no debe mostrar su línea de comandos.
        if isinstance(error, subprocess.CalledProcessError):
            reason = f"Un paso del motor falló (código {error.returncode}); el detalle está en el registro del trabajo."
        else:
            reason = str(error) or type(error).__name__
        write_status(status_folder, "failed", current["stage"], reason)
        raise
    write_status(status_folder, "ready" if arguments.prepare_only else "done", current["stage"])
