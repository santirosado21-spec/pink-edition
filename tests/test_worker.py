"""Procesador con cola local y motor falso: sin Supabase, GPU ni modelos."""

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("worker", ROOT / "scripts/worker.py")
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


def fake_engine(project, fail=None):
    """Imita a pink_edit.py: deja timeline, plan, póster, recorte y MP4 con su QC."""

    def run(arguments):
        if fail:
            raise RuntimeError(fail)
        name = arguments[arguments.index("--id") + 1]
        work, media = project / "work" / name, project / "public/work" / name
        (work / "out").mkdir(parents=True, exist_ok=True)
        media.mkdir(parents=True, exist_ok=True)
        (work / "timeline.json").write_text(json.dumps({"fps": 30, "duration_frames": 300, "clips": []}))
        (work / "plan.json").write_text(json.dumps({"style": "pink-demo-v1", "version": 1, "cuts": [], "cards": [], "backgrounds": []}))
        (media / "poster.jpg").write_bytes(b"jpg")
        (media / "person.webm").write_bytes(b"webm")
        if "--prepare-only" not in arguments:
            (work / "out" / f"{name}.mp4").write_bytes(b"mp4")
            (work / "out/QC.txt").write_text("QC en verde")
            (work / "out/QC.json").write_text(json.dumps({"duration_seconds": 10.0}))

    return run


class WorkerTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        base = Path(self.temp.name)
        self.project = base / "project"
        self.store = worker.Local(base / "queue")
        source = self.store.root / "storage/sources/owner/video-1.mp4"
        source.parent.mkdir(parents=True)
        source.write_bytes(b"source")
        self.store._write("videos", "video-1", {"id": "video-1", "owner_id": "owner", "source_path": "owner/video-1.mp4", "status": "uploaded"})
        self.patches = [mock.patch.object(worker, "PROJECT", self.project)]
        for patch in self.patches:
            patch.start()

    def tearDown(self):
        for patch in self.patches:
            patch.stop()
        self.temp.cleanup()

    def queue(self, job_id, kind, **fields):
        self.store._write("jobs", job_id, {"id": job_id, "video_id": "video-1", "kind": kind, "status": "queued", **fields})

    def run_once(self, engine):
        with mock.patch.object(worker, "run_engine", engine), mock.patch("sys.argv", ["worker.py", "--local-queue", str(self.store.root), "--once"]):
            worker.main()

    def test_analyze_then_render(self):
        self.queue("a", "analyze")
        self.run_once(fake_engine(self.project))
        self.assertEqual(self.store._read("jobs", "a")["status"], "done")
        video = self.store._read("videos", "video-1")
        self.assertEqual(video["status"], "ready_to_edit")
        self.assertEqual(video["person_path"], "owner/video-1/person.webm")
        plan = next(p for p in (self.store.root / "plans").glob("*.json"))
        plan_id = json.loads(plan.read_text())["id"]

        self.queue("r", "render", plan_id=plan_id)
        self.run_once(fake_engine(self.project))
        self.assertEqual(self.store._read("jobs", "r")["status"], "done")
        self.assertEqual(self.store._read("videos", "video-1")["status"], "done")
        render = self.store._read("plans", "render-r")
        self.assertEqual(render["qc"]["text"], "QC en verde")
        self.assertTrue((self.store.root / "storage/renders" / render["output_path"]).exists())

    def test_failure_keeps_reason(self):
        self.queue("a", "analyze")
        self.run_once(fake_engine(self.project, fail="El video dura 300 s y el máximo es 120 s."))
        job = self.store._read("jobs", "a")
        self.assertEqual(job["status"], "failed")
        self.assertIn("máximo es 120 s", job["error"])
        self.assertEqual(self.store._read("videos", "video-1")["status"], "failed")

    def test_failed_render_keeps_video_editable(self):
        self.queue("r", "render", plan_id="missing")
        self.run_once(fake_engine(self.project, fail="render roto"))
        self.assertEqual(self.store._read("jobs", "r")["status"], "failed")
        self.assertEqual(self.store._read("videos", "video-1")["status"], "ready_to_edit")

    def test_restart_requeues_jobs_from_this_host_only(self):
        self.queue("mine", "analyze", status="running", worker="mac@111")
        self.queue("other", "analyze", status="running", worker="mac-mini@222")
        self.store.requeue("mac")
        self.assertEqual(self.store._read("jobs", "mine")["status"], "queued")
        self.assertEqual(self.store._read("jobs", "other")["status"], "running")

    def test_too_many_attempts(self):
        self.queue("a", "analyze", attempts=worker.MAX_ATTEMPTS)
        self.run_once(fake_engine(self.project))
        job = self.store._read("jobs", "a")
        self.assertEqual(job["status"], "failed")
        self.assertIn("reintentos", job["error"])

    def test_cloud_requeue_filters_by_host(self):
        calls = []
        cloud = worker.Cloud("https://example.supabase.co", "clave")
        cloud.rows = lambda method, path, body=None, prefer=None: calls.append((method, path, body)) or []
        cloud.requeue("Santiagos-Mac.local")
        method, path, body = calls[0]
        self.assertEqual(method, "PATCH")
        self.assertEqual(path, "jobs?status=eq.running&worker=like.Santiagos-Mac.local%40*")
        self.assertEqual(body, {"status": "queued", "worker": None})


if __name__ == "__main__":
    unittest.main()
