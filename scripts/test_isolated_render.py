"""El render congelado no invoca preparación ni altera versiones del editor."""
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import pink_edit

class IsolatedRender(unittest.TestCase):
    def test_frozen_inputs_and_paths(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            media = root / "public/work/fixture"
            media.mkdir(parents=True)
            (media / "source.mp4").write_bytes(b"synthetic")
            work = root / "work/fixture/renders/11111111-1111-4111-8111-111111111111"
            (work / "input").mkdir(parents=True)
            (work / "out").mkdir()
            plan = {"version": 4, "style": "test", "cuts": [], "cards": [], "backgrounds": []}
            timeline = {"duration_frames": 30, "clips": []}
            for name, value in [("plan", plan), ("timeline", timeline), ("style", {"fps": 30})]:
                (work / f"input/{name}.json").write_text(json.dumps(value))
            active = root / "work/fixture/active-edit.json"
            active.write_text('{"unchanged":true}')
            args = SimpleNamespace(job="fixture", execution_id=work.name, plan=work / "input/plan.json",
                timeline_from=work / "input/timeline.json", style=work / "input/style.json", prepare_only=False, review=False)
            stages = []
            with patch.object(pink_edit, "PROJECT", root), patch.object(pink_edit, "run") as run, patch.object(pink_edit, "conform") as conform:
                pink_edit.main(args, work, stages.append)
                conform.assert_not_called()
                self.assertEqual(run.call_count, 2)
                self.assertEqual(stages, ["render", "finish"])
                render, finish = [call.args[0] for call in run.call_args_list]
                self.assertIn(work / "out/render.mp4", render)
                self.assertIn(work / "out/fixture.mp4", finish)
            self.assertEqual(json.loads((work / "plan.json").read_text()), plan)
            self.assertEqual(json.loads((work / "timeline.json").read_text()), timeline)
            self.assertEqual(active.read_text(), '{"unchanged":true}')
            props = json.loads((work / "props.json").read_text())
            self.assertEqual(props["plan"], plan)
            self.assertEqual(props["timeline"], timeline)

if __name__ == "__main__":
    unittest.main()
