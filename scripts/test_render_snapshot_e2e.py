"""Smoke opt-in: render real de 3s sintéticos, sin IA ni grabaciones privadas."""
import argparse
import os
import hashlib
import json
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def render_environment():
    """Respeta el Python elegido; por defecto usa el que ejecuta esta prueba."""
    return {**os.environ, "PINK_TOOLS_PYTHON": os.environ.get("PINK_TOOLS_PYTHON", sys.executable)}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep-video", action="store_true", help="Conserva sólo el MP4 sintético como evidencia local.")
    args = parser.parse_args()
    run_id = str(uuid.uuid4())
    job = f"qa-snapshot-{run_id[:8]}"
    work, media = ROOT / "work" / job, ROOT / "public/work" / job
    evidence = ROOT / "work/ollama-pilot/versioning-smoke" / run_id
    evidence.mkdir(parents=True)
    media.mkdir(parents=True)
    inputs = work / "renders" / run_id / "input"
    inputs.mkdir(parents=True)
    try:
        subprocess.run(["ffmpeg", "-v", "error", "-n", "-f", "lavfi", "-i",
            "color=c=0x17304a:s=1080x1920:r=30:d=3", "-f", "lavfi", "-i",
            "sine=frequency=440:sample_rate=48000:duration=3", "-vf",
            "drawbox=x=180:y=350:w=720:h=500:color=0x468cac:t=fill",
            "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-shortest", str(media / "source.mp4")], check=True)
        words = [{"id": f"w{i}", "text": text, "source_start_frame": 30 + i * 20,
                  "source_end_frame": 50 + i * 20, "alignment_score": 1}
                 for i, text in enumerate(["Prueba", "local"])]
        timeline = {"fps": 30, "duration_frames": 90, "coverage": {"source_word_count": 2, "retained_word_count": 2},
            "clips": [{"id": "c", "head": None, "face": None, "source_in_frame": 0, "source_out_frame": 90,
            "timeline_in_frame": 0, "duration_frames": 90, "words": words,
            "pages": [{"start_frame": 30, "end_frame": 80, "lines": [words]}]}]}
        plan = {"style": "pink-demo-v1", "version": 1, "cuts": [], "cards": [], "backgrounds": [],
            "preferences": {"vibe": "clean", "graphics": "none", "sfx": "none", "topic": "", "notes": "",
                            "brand_color": "#1f5fc4", "context_colors": False},
            "zooms": [{"id": "z", "anchor_word_id": "w0", "offset_frames": 0, "duration_frames": 30, "scale": 1.12}]}
        for name, value in [("plan", plan), ("timeline", timeline)]:
            (inputs / f"{name}.json").write_text(json.dumps(value))
        shutil.copyfile(ROOT / "style/pink-demo-v1.json", inputs / "style.json")
        active = work / "active-edit.json"
        active.write_text(json.dumps({"format": 1, "plan": plan, "timeline": timeline}))
        before = {str(f): digest(f) for f in [active, media / "source.mp4", *inputs.glob("*.json")]}
        with (evidence / "render.log").open("w") as log:
            subprocess.run([sys.executable, "scripts/pink_edit.py", str(media / "source.mp4"),
                "--id", job, "--execution-id", run_id, "--plan", str(inputs / "plan.json"),
                "--timeline-from", str(inputs / "timeline.json"), "--style", str(inputs / "style.json")],
                cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, check=True,
                env=render_environment())
        assert all(digest(Path(f)) == value for f, value in before.items()), "Source or frozen inputs changed"
        render = inputs.parent
        assert json.loads((render / "plan.json").read_text()) == plan
        assert json.loads((render / "timeline.json").read_text()) == timeline
        qc = json.loads((render / "out/QC.json").read_text())
        assert qc["status"] == "pass", qc["checks"]
        # Por defecto sólo informe/fotograma; el MP4 sintético requiere opt-in.
        shutil.copyfile(render / "out/QC.json", evidence / "QC.json")
        output = render / "out" / f"{job}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-ss", "1.7", "-i", str(output),
                        "-frames:v", "1", str(evidence / "frame.png")], check=True)
        if args.keep_video:
            shutil.copyfile(output, evidence / "synthetic-render.mp4")
        (evidence / "verification.json").write_text(json.dumps({"status": "pass", "unchanged_inputs": before,
            "qc": qc["checks"], "limitations": "Synthetic geometry, tone and fixture captions. Does not evaluate voice preservation, face detection or editorial quality."}, indent=2))
        print(f"PASS: frozen render and technical QC. Evidence: {evidence}")
    except Exception as exc:
        (evidence / "verification.json").write_text(json.dumps({
            "status": "failed", "error_type": type(exc).__name__, "error": str(exc),
            "limitations": "Synthetic test only. No production or editorial validation."}, indent=2))
        print(f"FAIL: evidence retained at {evidence}", file=sys.stderr)
        raise
    finally:
        shutil.rmtree(work, ignore_errors=True)
        shutil.rmtree(media, ignore_errors=True)

if __name__ == "__main__":
    main()
