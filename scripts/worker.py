"""Procesador de Pink.ai: toma trabajos de la cola y los ejecuta con el motor."""

import argparse
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

from plan_io import check_plan, check_preferences

PROJECT = Path(__file__).resolve().parents[1]
PINK_EDIT = PROJECT / "scripts/pink_edit.py"
MAX_ATTEMPTS = 3
# Límite de archivo del plan gratuito de Supabase Storage.
STORAGE_LIMIT = int(os.environ.get("PINK_STORAGE_LIMIT_MB", 45)) * 1024 * 1024
# Un trabajo colgado no debe bloquear la cola para siempre.
ENGINE_TIMEOUT = 45 * 60


class Cloud:
    """Cola y almacenamiento en Supabase, con la clave de servicio (sólo en este equipo)."""

    def __init__(self, url, key):
        self.url, self.key = url.rstrip("/"), key

    def request(self, method, path, body=None, headers=None, raw=None):
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        request = urllib.request.Request(self.url + path, data=data, method=method, headers={
            "apikey": self.key, "Authorization": f"Bearer {self.key}",
            **({"Content-Type": "application/json"} if body is not None else {}), **(headers or {})})
        try:
            return urllib.request.urlopen(request, timeout=600)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"{method} {path.split('?')[0]} → {error.code} {error.read().decode()[:300]}")

    def rows(self, method, path, body=None, prefer="return=representation"):
        with self.request(method, "/rest/v1/" + path, body, {"Prefer": prefer}) as response:
            text = response.read().decode()
        return json.loads(text) if text else []

    def claim(self, worker):
        with self.request("POST", "/rest/v1/rpc/claim_next_job", {"worker_name": worker}) as response:
            job = json.loads(response.read().decode() or "null")
        return job if job and job.get("id") else None

    def get_video(self, video_id):
        return self.rows("GET", f"videos?id=eq.{video_id}&select=*")[0]

    def update_video(self, video_id, fields):
        self.rows("PATCH", f"videos?id=eq.{video_id}", {**fields, "updated_at": "now()"})

    def download_source(self, video, destination):
        quoted = urllib.parse.quote(video["source_path"])
        with self.request("GET", f"/storage/v1/object/sources/{quoted}") as response, open(destination, "wb") as out:
            shutil.copyfileobj(response, out)

    def upload(self, bucket, path, file, content_type):
        size = Path(file).stat().st_size
        if size > STORAGE_LIMIT:
            raise RuntimeError(f"{Path(file).name} pesa {size // 2**20} MB y el almacenamiento admite {STORAGE_LIMIT // 2**20} MB.")
        with open(file, "rb") as handle:
            self.request("POST", f"/storage/v1/object/{bucket}/{urllib.parse.quote(path)}", raw=handle,
                         headers={"Content-Type": content_type, "Content-Length": str(size), "x-upsert": "true"}).close()

    def get_preferences(self, owner_id):
        rows = self.rows("GET", f"profiles?user_id=eq.{owner_id}&select=preferences")
        return rows[0]["preferences"] if rows else None

    def insert_plan(self, row):
        return self.rows("POST", "edit_plans", row)[0]

    def get_plan(self, plan_id):
        return self.rows("GET", f"edit_plans?id=eq.{plan_id}&select=*")[0]

    def insert_render(self, row):
        self.rows("POST", "renders", row)

    def finish_job(self, job_id, status, error=None):
        self.rows("PATCH", f"jobs?id=eq.{job_id}", {"status": status, "error": error, "progress": 1 if status == "done" else 0,
                                                    "finished_at": "now()"})

    def requeue(self, worker):
        self.rows("PATCH", f"jobs?status=eq.running&worker=eq.{worker}", {"status": "queued", "worker": None})


class Local(Cloud):
    """Misma interfaz sobre una carpeta: sirve para probar el flujo sin la nube."""

    def __init__(self, root):
        self.root = Path(root)
        for folder in ("jobs", "videos", "plans", "storage"):
            (self.root / folder).mkdir(parents=True, exist_ok=True)

    def _read(self, folder, name):
        return json.loads((self.root / folder / f"{name}.json").read_text())

    def _write(self, folder, name, value):
        (self.root / folder / f"{name}.json").write_text(json.dumps(value))

    def claim(self, worker):
        for file in sorted((self.root / "jobs").glob("*.json"), key=lambda f: f.stat().st_mtime):
            job = json.loads(file.read_text())
            if job["status"] == "queued":
                job.update(status="running", worker=worker, attempts=job.get("attempts", 0) + 1)
                file.write_text(json.dumps(job))
                return job
        return None

    def get_video(self, video_id):
        return self._read("videos", video_id)

    def update_video(self, video_id, fields):
        self._write("videos", video_id, {**self._read("videos", video_id), **fields})

    def download_source(self, video, destination):
        shutil.copyfile(self.root / "storage" / "sources" / video["source_path"], destination)

    def upload(self, bucket, path, file, content_type):
        target = self.root / "storage" / bucket / path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file, target)

    def get_preferences(self, owner_id):
        file = self.root / "profiles" / f"{owner_id}.json"
        return json.loads(file.read_text()) if file.exists() else None

    def insert_plan(self, row):
        row = {**row, "id": str(uuid.uuid4())}
        self._write("plans", row["id"], row)
        return row

    def get_plan(self, plan_id):
        return self._read("plans", plan_id)

    def insert_render(self, row):
        self._write("plans", "render-" + row["job_id"], row)

    def finish_job(self, job_id, status, error=None):
        job = self._read("jobs", job_id)
        self._write("jobs", job_id, {**job, "status": status, "error": error})

    def requeue(self, worker):
        for file in (self.root / "jobs").glob("*.json"):
            job = json.loads(file.read_text())
            if job["status"] == "running" and job.get("worker") == worker:
                file.write_text(json.dumps({**job, "status": "queued", "worker": None}))


def run_engine(name, arguments):
    process = subprocess.Popen([sys.executable, str(PINK_EDIT), *[str(a) for a in arguments]],
                               cwd=PROJECT, start_new_session=True)
    try:
        code = process.wait(timeout=ENGINE_TIMEOUT)
    except subprocess.TimeoutExpired:
        # El motor lanza FFmpeg y el render: se detiene el grupo entero.
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()
        raise RuntimeError(f"El motor tardó más de {ENGINE_TIMEOUT // 60} minutos y se detuvo.")
    if code:
        # El motivo legible lo deja el motor en status.json.
        try:
            reason = json.loads((PROJECT / "work" / name / "status.json").read_text())["error"]
        except (OSError, ValueError, KeyError):
            reason = None
        raise RuntimeError(reason or f"El motor terminó con error (código {code}).")


def fit(video):
    """Una copia del render que quepa en el almacenamiento; el original se conserva."""
    if video.stat().st_size <= STORAGE_LIMIT:
        return video
    seconds = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(video)],
        check=True, text=True, capture_output=True).stdout)
    rate = int(STORAGE_LIMIT * 0.92 * 8 / seconds) - 192_000
    light = video.with_name(f"{video.stem}-light.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-c:v", "libx264", "-preset", "medium",
                    "-b:v", str(rate), "-maxrate", str(rate), "-bufsize", str(rate * 2), "-pix_fmt", "yuv420p",
                    "-c:a", "copy", "-movflags", "+faststart", str(light)], check=True)
    return light


def shrink(webm):
    """Una copia más liviana del recorte para el almacenamiento; el original se conserva."""
    if webm.stat().st_size <= STORAGE_LIMIT:
        return webm
    light = webm.with_name("person-light.webm")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-c:v", "libvpx-vp9", "-i", str(webm), "-c:v", "libvpx-vp9",
                    "-pix_fmt", "yuva420p", "-crf", "34", "-b:v", "0", "-row-mt", "1", str(light)], check=True)
    return light


def analyze(store, job, video, source):
    name = video["id"]
    arguments = [source, "--id", name, "--prepare-only", "--allow-model-download"]
    # El estilo del creador se copia al plan inicial; uno inválido no detiene el video.
    preferences = store.get_preferences(video["owner_id"])
    if preferences and not check_preferences(preferences):
        file = source.with_name(f"{name}-preferences.json")
        file.write_text(json.dumps(preferences))
        arguments += ["--preferences", file]
    run_engine(name, arguments)
    work, media = PROJECT / "work" / name, PROJECT / "public/work" / name
    timeline = json.loads((work / "timeline.json").read_text())
    plan = json.loads((work / "plan.json").read_text())
    folder = f"{video['owner_id']}/{name}"
    fields = {"status": "ready_to_edit", "error": None, "duration_seconds": timeline["duration_frames"] / timeline["fps"],
              "width": 1080, "height": 1920, "fps": timeline["fps"]}
    if (media / "poster.jpg").exists():
        store.upload("media", f"{folder}/poster.jpg", media / "poster.jpg", "image/jpeg")
        fields["poster_path"] = f"{folder}/poster.jpg"
    if (media / "person.webm").exists():
        store.upload("media", f"{folder}/person.webm", shrink(media / "person.webm"), "video/webm")
        fields["person_path"] = f"{folder}/person.webm"
    store.insert_plan({"video_id": name, "version": 1, "style": plan["style"], "source": "auto", "config": plan, "timeline": timeline})
    store.update_video(name, fields)


def render(store, job, video, source):
    name = video["id"]
    plan_row = store.get_plan(job["plan_id"])
    errors = check_plan(plan_row["config"], plan_row["timeline"])
    if errors:
        raise RuntimeError("El plan no es válido: " + " ".join(errors[:3]))
    # El timeline guardado con esta versión del plan trae las cabezas con que se vio la
    # vista previa: el motor las reutiliza en vez de medirlas otra vez en esta máquina.
    (PROJECT / "work" / name).mkdir(parents=True, exist_ok=True)
    (PROJECT / "work" / name / "timeline.json").write_text(json.dumps(plan_row["timeline"]))
    plan_file = PROJECT / "work" / "_cloud" / f"{plan_row['id']}.json"
    plan_file.parent.mkdir(parents=True, exist_ok=True)
    plan_file.write_text(json.dumps(plan_row["config"]))
    run_engine(name, [source, "--id", name, "--plan", plan_file])
    out = PROJECT / "work" / name / "out"
    output = f"{video['owner_id']}/{name}/{plan_row['id']}.mp4"
    store.upload("renders", output, fit(out / f"{name}.mp4"), "video/mp4")
    qc = {"text": (out / "QC.txt").read_text(), "json": json.loads((out / "QC.json").read_text())}
    store.insert_render({"video_id": name, "plan_id": plan_row["id"], "job_id": job["id"], "output_path": output,
                         "duration_seconds": qc["json"]["duration_seconds"], "qc": qc})
    store.update_video(name, {"status": "done", "error": None})


def process(store, job):
    video = store.get_video(job["video_id"])
    if job.get("attempts", 1) > MAX_ATTEMPTS:
        raise RuntimeError("Demasiados reintentos.")
    store.update_video(video["id"], {"status": "processing" if job["kind"] == "analyze" else "rendering"})
    source = PROJECT / "work" / "_cloud" / f"{video['id']}{Path(video['source_path']).suffix}"
    source.parent.mkdir(parents=True, exist_ok=True)
    store.download_source(video, source)
    (analyze if job["kind"] == "analyze" else render)(store, job, video, source)


def worker_name():
    """Nombre estable del procesador, para reencolar al reiniciar lo que dejó a medias.

    Ni el número de proceso ni el nombre del equipo sirven: el primero cambia en cada
    arranque y el segundo, en macOS, con la red. Se guarda la primera vez. Se asume un
    procesador por carpeta de proyecto.
    """
    if os.environ.get("PINK_WORKER_NAME"):
        return os.environ["PINK_WORKER_NAME"]
    file = PROJECT / "work" / ".worker-name"
    if not file.exists():
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(f"{socket.gethostname()}-{uuid.uuid4().hex[:6]}")
    return file.read_text().strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-queue", type=Path, help="Cola en una carpeta, sin Supabase (pruebas).")
    parser.add_argument("--once", action="store_true", help="Procesa un trabajo y termina.")
    parser.add_argument("--interval", type=float, default=5)
    args = parser.parse_args()
    if args.local_queue:
        store = Local(args.local_queue)
    else:
        url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise SystemExit("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.")
        store = Cloud(url, key)
    worker = worker_name()
    store.requeue(worker)
    print(f"Procesador {worker} esperando trabajos.", flush=True)
    while True:
        job = store.claim(worker)
        if not job:
            if args.once:
                return print("Sin trabajos.", flush=True)
            time.sleep(args.interval)
            continue
        print(f"Trabajo {job['id']} ({job['kind']})", flush=True)
        try:
            process(store, job)
            store.finish_job(job["id"], "done")
        except Exception as error:  # el trabajo falla con su motivo; el procesador sigue vivo
            message = str(error)[:500]
            print(f"Falló: {message}", flush=True)
            store.finish_job(job["id"], "failed", message)
            try:
                store.update_video(job["video_id"], {"status": "failed" if job["kind"] == "analyze" else "ready_to_edit", "error": message})
            except Exception:
                pass
        if args.once:
            return


if __name__ == "__main__":
    main()
