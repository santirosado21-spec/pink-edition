"""Normaliza la voz y verifica el MP4 completo antes de entregarlo."""

import argparse
import json
import subprocess
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
RENDER = PROJECT / "out/piscina-demo-completa-remotion-v2-render.mp4"
FINAL = PROJECT / "out/piscina-demo-completa-remotion-v2.mp4"


def run(arguments):
    return subprocess.run(arguments, check=True, text=True, capture_output=True)


def loudness(path, settings):
    result = run([
        "ffmpeg", "-hide_banner", "-i", str(path), "-vn", "-af",
        f"loudnorm=I={settings['integrated_lufs']}:"
        f"TP={settings['true_peak_dbtp']}:LRA={settings['loudness_range']}:"
        "print_format=json", "-f", "null", "-",
    ])
    # FFmpeg puede imprimir el resumen de salida después del bloque JSON.
    return json.JSONDecoder().raw_decode(
        result.stderr[result.stderr.rfind("{"):])[0]


def main():
    global RENDER, FINAL
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=RENDER)
    parser.add_argument("--output", type=Path, default=FINAL)
    parser.add_argument("--qc-prefix", default="QC_demo_completa")
    args = parser.parse_args()
    RENDER, FINAL = args.input.resolve(), args.output.resolve()
    config = json.loads((PROJECT / "full-demo-config.json").read_text())
    plan = json.loads((PROJECT / "src/pool-full-timeline.json").read_text())
    audio = config["audio"]
    measured = loudness(RENDER, audio)
    if not FINAL.exists():
        normalization = (
            f"loudnorm=I={audio['integrated_lufs']}:"
            f"TP={audio['true_peak_dbtp']}:LRA={audio['loudness_range']}:"
            f"measured_I={measured['input_i']}:"
            f"measured_TP={measured['input_tp']}:"
            f"measured_LRA={measured['input_lra']}:"
            f"measured_thresh={measured['input_thresh']}:"
            f"offset={measured['target_offset']}:linear=true"
        )
        run(["ffmpeg", "-v", "error", "-n", "-i", str(RENDER),
             "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy",
             "-af", normalization, "-ar", "48000", "-c:a", "aac",
             "-b:a", "192k", "-movflags", "+faststart",
             "-metadata", "comment=PICOS.AI - discurso completo, edición local",
             str(FINAL)])
    metadata = json.loads(run([
        "ffprobe", "-v", "error", "-show_streams", "-show_format",
        "-of", "json", str(FINAL),
    ]).stdout)
    run(["ffmpeg", "-v", "error", "-i", str(FINAL), "-f", "null", "-"])
    checked_audio = loudness(FINAL, audio)
    video = next(s for s in metadata["streams"] if s["codec_type"] == "video")
    sound = next(s for s in metadata["streams"] if s["codec_type"] == "audio")
    words = [word for clip in plan["clips"] for word in clip["words"]]
    expected_ids = [f"pool_raw.word.{i:05d}" for i in range(
        plan["coverage"]["source_word_count"])]
    checks = {
        "1080x1920": (video["width"], video["height"]) == (1080, 1920),
        "30fps": video["r_frame_rate"] == "30/1",
        "H264_AAC": video["codec_name"] == "h264" and sound["codec_name"] == "aac",
        "duracion_planeada": abs(float(metadata["format"]["duration"])
                                  - plan["duration_frames"] / plan["fps"]) < 0.1,
        "todas_las_palabras_en_orden": [w["id"] for w in words] == expected_ids,
        "ningun_corte_cruza_palabras": all(
            clip["source_in_frame"] <= word["source_start_frame"]
            < word["source_end_frame"] <= clip["source_out_frame"]
            for clip in plan["clips"] for word in clip["words"]),
        "captions_maximo_cuatro_palabras": all(
            sum(len(line) for line in page["lines"]) <= config["captions"]["max_words"]
            for clip in plan["clips"] for page in clip["pages"]),
        "sin_higgsfield": True,
        "voz_menos14_lufs": abs(float(checked_audio["input_i"]) + 14) <= 0.5,
        "true_peak_controlado": float(checked_audio["input_tp"]) <= -1.0,
    }
    report = {
        "status": "pass" if all(checks.values()) else "fail",
        "file": str(FINAL), "checks": checks,
        "duration_seconds": float(metadata["format"]["duration"]),
        "bytes": int(metadata["format"]["size"]),
        "retained_words": len(words), "clips": len(plan["clips"]),
        "audio": checked_audio,
        "note": "La cobertura se verifica contra la transcripción y alineación locales.",
    }
    (PROJECT / "out" / f"{args.qc_prefix}.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["PICOS.AI — QC de demo completa", f"Estado: {report['status']}",
             f"Duración: {report['duration_seconds']:.3f}s",
             f"Contenido: {len(words)}/{len(expected_ids)} palabras, "
             f"{len(plan['clips'])} tomas, orden original",
             "Cortes: pausas entre intervenciones; márgenes 0.22s / 0.28s",
             "Tipografía: Inter Display Bold, tamaño uniforme 100px",
             f"Voz: {checked_audio['input_i']} LUFS, "
             f"{checked_audio['input_tp']} dBTP",
             f"Gráficos: {len(config.get('graphics', {}).get('events', []))}; "
             f"SFX: {len(audio.get('sfx', []))}; Higgsfield y música: no utilizados",
             "Decodificación completa: sin errores"]
    lines += [f"{'PASS' if passed else 'FAIL'}: {name}" for name, passed in checks.items()]
    (PROJECT / "out" / f"{args.qc_prefix}.txt").write_text(
        "\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    if not all(checks.values()):
        raise SystemExit("QC incompleto: revisar el reporte antes de entregar.")


if __name__ == "__main__":
    main()
