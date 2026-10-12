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

from plan_io import empty_plan, load_plan, save_plan

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


def check_limits(source, style):
    """Un video horizontal o más largo que el máximo se rechaza antes de gastar cómputo."""
    video = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height:stream_side_data=rotation", "-of", "json", str(source)],
        check=True, text=True, capture_output=True).stdout)["streams"][0]
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
    parser.add_argument("--language", default="es")
    parser.add_argument("--model", default="small", help="Modelo de transcripción.")
    parser.add_argument("--allow-model-download", action="store_true")
    parser.add_argument("--skip-matte", action="store_true",
                        help="Sin recorte de la persona ni tarjetas detrás de ella.")
    parser.add_argument("--prepare-only", action="store_true",
                        help="Deja el video listo para editar, sin renderizar.")
    parser.add_argument("--review", action="store_true",
                        help="Genera además los frames de revisión.")
    args = parser.parse_args()
    args.job = args.id or re.sub(r"[^a-z0-9]+", "-", args.source.stem.lower()).strip("-")
    return args


def main(args, work, stage):
    job = args.job
    media = PROJECT / "public/work" / job
    style = json.loads(args.style.read_text(encoding="utf-8"))
    source = media / "source.mp4"
    person = media / "person.webm"
    transcript, timeline = work / "transcript.json", work / "timeline.json"
    plan_path = work / "plan.json"
    downloads = ["--allow-model-download"] if args.allow_model_download else []

    stage("conform")
    check_limits(args.source.resolve(), style)
    conform(args.source.resolve(), source, style["fps"])
    if not (media / "poster.jpg").exists():
        run(["ffmpeg", "-v", "error", "-y", "-ss", "1", "-i", source, "-frames:v", "1",
             "-vf", "scale=360:-2", media / "poster.jpg"])
    stage("transcribe")
    if not transcript.exists():
        run([ASR_PYTHON, SCRIPTS / "transcribe.py", "--source", source,
             "--output", transcript, "--language", args.language,
             "--model", args.model, *downloads])
    if args.plan:
        save_plan(plan_path, load_plan(args.plan))
    elif not plan_path.exists():
        save_plan(plan_path, empty_plan(style["id"]))
    stage("cut")
    run([ASR_PYTHON, SCRIPTS / "prepare_full_demo.py", "--source", source,
         "--transcript", transcript, "--timeline", timeline, "--out-dir", work,
         "--style", args.style, "--plan", plan_path,
         "--corrections", work / "corrections.json",
         "--word-prefix", f"{job}.word.", "--language", args.language, *downloads])
    stage("matte")
    if not args.skip_matte and not person.exists():
        run([TOOLS_PYTHON, SCRIPTS / "make_matte.py", "--source", source,
             "--output", person])
    stage("place")
    plan = load_plan(plan_path)
    if plan["cards"]:
        if not person.exists():
            raise SystemExit("El plan tiene tarjetas: hace falta el recorte de la persona.")
        run([TOOLS_PYTHON, SCRIPTS / "place_graphics.py", "--style", args.style,
             "--plan", plan_path, "--timeline", timeline, "--person", person])
        plan = load_plan(plan_path)

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
         "--concurrency=3"])
    stage("finish")
    run([TOOLS_PYTHON, SCRIPTS / "finish_full_demo.py", "--input", render,
         "--output", final, "--timeline", timeline, "--style", args.style,
         "--plan", plan_path, "--qc-prefix", "QC", "--report-dir", work / "out"])
    if args.review:
        run([TOOLS_PYTHON, SCRIPTS / "review_frames.py", "--style", args.style,
             "--plan", plan_path, "--timeline", timeline, "--props", props,
             "--out", work / "review"])
    print(f"Listo: {final}", flush=True)


if __name__ == "__main__":
    if sys.version_info < (3, 10):
        raise SystemExit("Requiere Python 3.10 o posterior.")
    arguments = parse()
    folder = PROJECT / "work" / arguments.job
    (folder / "out").mkdir(parents=True, exist_ok=True)
    current = {"stage": "start"}

    def enter(name):
        current["stage"] = name
        write_status(folder, "running", name)

    try:
        main(arguments, folder, enter)
    except BaseException as error:
        # El usuario ve este texto: un paso que falló no debe mostrar su línea de comandos.
        if isinstance(error, subprocess.CalledProcessError):
            reason = f"Un paso del motor falló (código {error.returncode}); el detalle está en el registro del trabajo."
        else:
            reason = str(error) or type(error).__name__
        write_status(folder, "failed", current["stage"], reason)
        raise
    write_status(folder, "ready" if arguments.prepare_only else "done", current["stage"])
