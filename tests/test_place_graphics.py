"""Colocación de tarjetas con recortes sintéticos: persona baja, alta y demasiado alta."""

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("place_graphics", ROOT / "scripts/place_graphics.py")
place_graphics = importlib.util.module_from_spec(spec)
spec.loader.exec_module(place_graphics)
STYLE = json.loads((ROOT / "style/pink-demo-v1.json").read_text())


def matte(path, person_top, frames=30):
    """Recorte VP9 con alfa de 270×480: opaco desde `person_top` (en px del lienzo de 1920)."""
    y = round(person_top / 4)
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=gray:s=270x480:r=30:d={frames / 30}",
        "-vf", f"format=yuva420p,geq=lum='p(X,Y)':cb=128:cr=128:a='if(gte(Y,{y}),255,0)'",
        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", str(path)], check=True)


class PlaceTest(unittest.TestCase):
    def test_rules(self):
        card = STYLE["graphics"]
        # Cabeza baja: cabe arriba, detrás de la persona.
        top, layer = place_graphics.place(900, STYLE)
        self.assertEqual(layer, "behind")
        self.assertEqual(top, 900 - card["gap_above_person"] - card["height"])
        # Persona a todo lo alto: al frente, entre el rostro y los captions.
        top, layer = place_graphics.place(160, STYLE)
        self.assertEqual(layer, "front")
        self.assertGreaterEqual(top, 160 + card["face_height"])
        self.assertLessEqual(top + card["height"], STYLE["captions"]["top"])
        # Sin sitio en ninguna parte: arriba y con aviso.
        self.assertEqual(place_graphics.place(400, STYLE), (card["minimum_top"], None))

    def run_script(self, person_top):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            matte(folder / "person.webm", person_top)
            word = {"id": "w0", "text": "hola", "source_start_frame": 0, "source_end_frame": 10, "alignment_score": None}
            timeline = {"fps": 30, "duration_frames": 30, "clips": [{"id": "c0", "source_in_frame": 0, "source_out_frame": 30, "duration_frames": 30,
                        "timeline_in_frame": 0, "timeline_out_frame": 30, "words": [word], "pages": []}]}
            plan = {"style": "pink-demo-v1", "version": 1, "cuts": [], "backgrounds": [], "cards": [
                {"id": "card_1", "label": "prueba", "theme": "base", "kind": "alert", "anchor_word_id": "w0", "offset_frames": 0,
                 "duration_frames": 20, "layer": "front", "beat": {"anchor_word_id": "w0", "offset_frames": 0}}]}
            (folder / "timeline.json").write_text(json.dumps(timeline))
            (folder / "plan.json").write_text(json.dumps(plan))
            output = subprocess.run([sys.executable, str(ROOT / "scripts/place_graphics.py"), "--plan", str(folder / "plan.json"),
                                     "--timeline", str(folder / "timeline.json"), "--person", str(folder / "person.webm")],
                                    check=True, text=True, capture_output=True).stdout
            return json.loads((folder / "plan.json").read_text())["cards"][0], output

    def test_low_person_goes_behind(self):
        card, output = self.run_script(1000)
        self.assertNotIn("layer", card)
        # La detección usa el recorte reducido a 212 px de alto: unos pocos px de margen.
        self.assertAlmostEqual(card["top"], 1000 - 70 - 250, delta=12)

    def test_tall_person_goes_front(self):
        card, output = self.run_script(160)
        self.assertEqual(card["layer"], "front")
        self.assertIn("RESPALDO", output)


if __name__ == "__main__":
    unittest.main()
