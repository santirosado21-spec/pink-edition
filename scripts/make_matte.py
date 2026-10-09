"""Recorta a la persona del raw, en local, para poner gráficos detrás de ella."""

import argparse
import subprocess
from pathlib import Path

import numpy as np
import torch

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "public/client/pool-raw-full.mp4"
OUTPUT = PROJECT / "public/client/pool-person.webm"


def probe(path):
    values = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate", "-of", "csv=p=0", str(path)],
        check=True, text=True, capture_output=True).stdout.strip().split(",")
    return int(values[0]), int(values[1]), values[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--model", default="resnet50",
                        choices=["resnet50", "mobilenetv3"])
    parser.add_argument("--limit", type=int, help="Sólo los primeros N frames.")
    args = parser.parse_args()
    width, height, rate = probe(args.source)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    # Robust Video Matting: mantiene memoria entre frames y evita parpadeos.
    model = torch.hub.load("PeterL1n/RobustVideoMatting", args.model,
                           trust_repo=True).eval().to(device)
    reader = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(args.source), "-f", "rawvideo",
         "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    # WebM con canal alfa: el mismo cuadro del raw, transparente fuera de la persona.
    writer = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba",
         "-s", f"{width}x{height}", "-r", rate, "-i", "-", "-c:v", "libvpx-vp9",
         "-pix_fmt", "yuva420p", "-crf", "18", "-b:v", "0", "-g", "30",
         "-row-mt", "1", str(args.output)], stdin=subprocess.PIPE)
    state, count, size = [None] * 4, 0, width * height * 3
    with torch.no_grad():
        while (raw := reader.stdout.read(size)) and len(raw) == size:
            frame = np.frombuffer(raw, np.uint8).reshape(height, width, 3)
            source = (torch.from_numpy(frame.copy()).to(device).permute(2, 0, 1)
                      .float().div(255).unsqueeze(0))
            _, alpha, *state = model(source, *state, downsample_ratio=1.0)
            matte = (alpha[0, 0].clamp(0, 1) * 255).byte().cpu().numpy()
            writer.stdin.write(np.dstack([frame, matte]).tobytes())
            count += 1
            if count % 300 == 0:
                print(f"{count} frames", flush=True)
            if args.limit and count >= args.limit:
                break
    reader.kill()
    writer.stdin.close()
    writer.wait()
    print(f"Listo: {count} frames con alfa en {args.output}", flush=True)


if __name__ == "__main__":
    main()
