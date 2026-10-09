"""Transcribe audio localmente con WhisperX y tiempos por palabra."""

import argparse
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT / "local/raw-transcript.json"


def fill_missing_times(words, segment_start, segment_end):
    """WhisperX no alinea cifras ni símbolos; se reparten entre sus vecinas.

    Descartarlas quitaría del video una palabra que sí se dijo.
    """
    index = 0
    while index < len(words):
        if "start" in words[index] and "end" in words[index]:
            index += 1
            continue
        last = index
        while last + 1 < len(words) and not (
                "start" in words[last + 1] and "end" in words[last + 1]):
            last += 1
        begin = words[index - 1]["end"] if index else segment_start
        finish = words[last + 1]["start"] if last + 1 < len(words) else segment_end
        step = max(0.0, finish - begin) / (last - index + 1)
        for offset, word in enumerate(words[index:last + 1]):
            word["start"] = begin + step * offset
            word["end"] = begin + step * (offset + 1)
        index = last + 1


def transcribe(source, output, language, model_name, allow_model_download):
    """Carga modelos locales salvo que se autorice su descarga explícita."""
    import torch
    import whisperx

    torch.set_num_threads(4)
    cache_only = not allow_model_download
    audio = whisperx.load_audio(str(source))
    try:
        model = whisperx.load_model(
            model_name, "cpu", compute_type="int8",
            language=language, local_files_only=cache_only)
        result = model.transcribe(audio, batch_size=4, language=language)
        align_model, metadata = whisperx.load_align_model(
            language_code=language, device="cpu",
            model_cache_only=cache_only)
        result = whisperx.align(
            result["segments"], align_model, metadata, audio, "cpu",
            return_char_alignments=False, print_progress=True)
    except Exception as error:
        if cache_only:
            raise SystemExit(
                "No se pudo cargar un modelo local. Verifica que esté en caché "
                "o usa --allow-model-download para autorizar la descarga."
            ) from error
        raise

    segments = []
    for segment in result["segments"]:
        words = [dict(word) for word in segment.get("words", [])]
        fill_missing_times(words, segment["start"], segment["end"])
        segments.append({"words": [
            {"word": word["word"], "start": word["start"], "end": word["end"]}
            for word in words]})
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps({"segments": segments}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")
    print(f"Transcripción lista: {output}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--language", default="es")
    parser.add_argument("--model", default="small")
    parser.add_argument("--allow-model-download", action="store_true")
    args = parser.parse_args()
    transcribe(args.source.resolve(), args.output.resolve(), args.language,
               args.model, args.allow_model_download)


if __name__ == "__main__":
    main()
