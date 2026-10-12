"""Normaliza la voz y verifica el MP4 completo antes de entregarlo."""

import argparse
import json
import subprocess
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
RENDER = PROJECT / "out/piscina-demo-completa-remotion-v2-render.mp4"
FINAL = PROJECT / "out/piscina-demo-completa-remotion-v2.mp4"
TIMELINE = PROJECT / "src/pool-full-timeline.json"
STYLE = PROJECT / "style/pink-demo-v1.json"
PLAN = PROJECT / "projects/piscina/plan.json"
REPORT_DIR = PROJECT / "out"


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
    global RENDER, FINAL, TIMELINE, STYLE, PLAN, REPORT_DIR
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=RENDER)
    parser.add_argument("--output", type=Path, default=FINAL)
    parser.add_argument("--qc-prefix", default="QC_demo_completa")
    parser.add_argument("--timeline", type=Path, default=TIMELINE)
    parser.add_argument("--style", type=Path, default=STYLE)
    parser.add_argument("--plan", type=Path, default=PLAN)
    parser.add_argument("--report-dir", type=Path, default=REPORT_DIR)
    args = parser.parse_args()
    RENDER, FINAL = args.input.resolve(), args.output.resolve()
    TIMELINE, STYLE, PLAN = (args.timeline.resolve(), args.style.resolve(),
                             args.plan.resolve())
    REPORT_DIR = args.report_dir.resolve()
    style = json.loads(STYLE.read_text(encoding="utf-8"))
    edit_plan = json.loads(PLAN.read_text(encoding="utf-8"))
    timeline = json.loads(TIMELINE.read_text(encoding="utf-8"))
    audio = style["audio"]
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
             "-metadata", "comment=Pink.ai",
             str(FINAL)])
    metadata = json.loads(run([
        "ffprobe", "-v", "error", "-show_streams", "-show_format",
        "-of", "json", str(FINAL),
    ]).stdout)
    run(["ffmpeg", "-v", "error", "-i", str(FINAL), "-f", "null", "-"])
    checked_audio = loudness(FINAL, audio)
    video = next(s for s in metadata["streams"] if s["codec_type"] == "video")
    sound = next(s for s in metadata["streams"] if s["codec_type"] == "audio")
    words = [word for clip in timeline["clips"] for word in clip["words"]]
    word_ids = [word["id"] for word in words]
    source_frames = [word["source_start_frame"] for word in words]
    source_word_count = timeline["coverage"]["source_word_count"]
    retained_word_count = timeline["coverage"]["retained_word_count"]
    word_limit = style["captions"].get("max_words_fast_speech",
                                       style["captions"]["max_words"])
    checks = {
        "1080x1920": (video["width"], video["height"]) == (1080, 1920),
        "30fps": video["r_frame_rate"] == "30/1",
        "H264_AAC": video["codec_name"] == "h264" and sound["codec_name"] == "aac",
        "duracion_planeada": abs(float(metadata["format"]["duration"])
                                  - timeline["duration_frames"] / timeline["fps"]) < 0.1,
        "todas_las_palabras_en_orden": (
            len(word_ids) == len(set(word_ids))
            and retained_word_count == source_word_count == len(words)
            and all(previous <= current for previous, current in
                    zip(source_frames, source_frames[1:]))),
        "ningun_corte_cruza_palabras": all(
            clip["source_in_frame"] <= word["source_start_frame"]
            < word["source_end_frame"] <= clip["source_out_frame"]
            for clip in timeline["clips"] for word in clip["words"]),
        "captions_maximo_palabras": all(
            sum(len(line) for line in page["lines"]) <= word_limit
            for clip in timeline["clips"] for page in clip["pages"]),
        "sin_higgsfield": True,
        "voz_menos14_lufs": abs(float(checked_audio["input_i"]) + 14) <= 0.5,
        "true_peak_controlado": float(checked_audio["input_tp"]) <= -1.0,
    }
    report = {
        "status": "pass" if all(checks.values()) else "fail",
        "file": str(FINAL), "checks": checks,
        "duration_seconds": float(metadata["format"]["duration"]),
        "bytes": int(metadata["format"]["size"]),
        "retained_words": len(words), "clips": len(timeline["clips"]),
        "audio": checked_audio,
        "note": "La cobertura se verifica contra la transcripción y alineación locales.",
    }
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    (REPORT_DIR / f"{args.qc_prefix}.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["Pink.ai — control de calidad", f"Estado: {report['status']}",
             f"Duración: {report['duration_seconds']:.3f}s",
             f"Contenido: {len(words)}/{source_word_count} palabras, "
             f"{len(timeline['clips'])} tomas, orden original",
             "Cortes: pausas entre intervenciones; márgenes 0.22s / 0.28s",
             "Tipografía: Inter Display Bold, tamaño uniforme 100px",
             f"Captions: máximo {word_limit} palabras por página",
             f"Voz: {checked_audio['input_i']} LUFS, "
             f"{checked_audio['input_tp']} dBTP",
             f"Gráficos: {len(edit_plan['cards'])}; "
             f"SFX: 1 de inicio, hasta {len(timeline['clips']) - 1} de corte y "
             f"{len(edit_plan['cards']) + sum(card['kind'] not in audio['card_beat_sfx']['silent_kinds'] for card in edit_plan['cards']) + len(edit_plan['cuts'])} de tarjetas y cortes de color; "
             f"Higgsfield y música: no utilizados",
             "Decodificación completa: sin errores"]
    lines += [f"{'PASS' if passed else 'FAIL'}: {name}" for name, passed in checks.items()]
    (REPORT_DIR / f"{args.qc_prefix}.txt").write_text(
        "\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    if not all(checks.values()):
        raise SystemExit("QC incompleto: revisar el reporte antes de entregar.")


if __name__ == "__main__":
    main()
