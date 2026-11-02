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
        # El alineador puede solapar dos palabras. No colocar el token sin
        # tiempo después de la palabra siguiente; la voz original no se toca.
        begin = min(begin, finish)
        step = max(0.0, finish - begin) / (last - index + 1)
        for offset, word in enumerate(words[index:last + 1]):
            word["start"] = begin + step * offset
            word["end"] = begin + step * (offset + 1)
        index = last + 1


def transcribe(source, output, language, model_name, allow_model_download, vocabulary=""):
    """Carga modelos locales salvo que se autorice su descarga explícita."""
    if language in ("auto", "mixed"):
        return transcribe_multilingual(source, output, model_name, allow_model_download, vocabulary)
    import torch
    import whisperx

    torch.set_num_threads(4)
    cache_only = not allow_model_download
    audio = whisperx.load_audio(str(source))
    try:
        model = whisperx.load_model(
            model_name, "cpu", compute_type="int8",
            language=language, local_files_only=cache_only,
            asr_options={"initial_prompt": vocabulary or None})
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


def uncovered_speech(speech, segments, sample_rate=16000):
    """Tramos con voz sin texto alineado; se unen antes de aplicar el mínimo."""
    # Una frase puede contener palabras al principio y al final y omitir voz
    # entre ellas. Su intervalo completo no demuestra cobertura de esa voz.
    covered = sorted((word["start"], word["end"])
                     for segment in segments
                     for word in segment.get("words", [segment])
                     if word["end"] > word["start"])
    gaps = []
    for span in speech:
        cursor, finish = span["start"] / sample_rate, span["end"] / sample_rate
        for begin, end in covered:
            if end <= cursor or begin >= finish:
                continue
            if begin > cursor:
                gaps.append([cursor, min(begin, finish)])
            cursor = max(cursor, min(end, finish))
        if cursor < finish:
            gaps.append([cursor, finish])
    merged = []
    for start, end in gaps:
        if (merged and start - merged[-1][1] < 0.35
                and not any(a < start and b > merged[-1][1] for a, b in covered)):
            merged[-1][1] = end
        else:
            merged.append([start, end])
    return [span for span in merged if span[1] - span[0] >= 1.2]


def chronological_segments(segments):
    """Intercala palabras recuperadas dentro de una frase sin duplicar la frase."""
    words = sorted(((word, segment.get("language"))
                    for segment in segments for word in segment["words"]),
                   key=lambda item: item[0]["start"])
    result = []
    for word, language in words:
        if not result or result[-1]["language"] != language:
            result.append({"start": word["start"], "end": word["end"],
                           "language": language, "words": []})
        result[-1]["words"].append(dict(word))
        result[-1]["end"] = max(result[-1]["end"], word["end"])
    return result


def transcribe_multilingual(source, output, model_name, allow_model_download, vocabulary=""):
    """ASR automático, alineación y recuperación de voz omitida al cambiar idioma."""
    import torch
    import whisperx
    from faster_whisper.vad import get_speech_timestamps, VadOptions

    torch.set_num_threads(4)
    cache_only = not allow_model_download
    audio = whisperx.load_audio(str(source))
    model = whisperx.load_model(model_name, "cpu", compute_type="int8",
        language=None, local_files_only=cache_only,
        asr_options={"initial_prompt": vocabulary or None})
    aligners = {}
    languages = []

    def recognize(start, end):
        chunk = audio[round(start * 16000):round(end * 16000)]
        result = model.transcribe(chunk, batch_size=2)
        language = result["language"]
        # El modo ofrecido es español + inglés. Un fragmento de ruido muy corto
        # puede parecer otro idioma: no descargar modelos ni inventar texto.
        if language not in ("es", "en"):
            return []
        languages.append(language)
        if language not in aligners:
            aligners[language] = whisperx.load_align_model(
                language_code=language, device="cpu", model_cache_only=cache_only)
        aligner, metadata = aligners[language]
        aligned = whisperx.align(result["segments"], aligner, metadata, chunk,
            "cpu", return_char_alignments=False)
        found = []
        for segment in aligned["segments"]:
            words = [dict(word) for word in segment.get("words", [])]
            fill_missing_times(words, segment["start"], segment["end"])
            words = [{"word": w["word"], "start": round(w["start"] + start, 3),
                      "end": round(w["end"] + start, 3)} for w in words]
            if words:
                found.append({"start": words[0]["start"], "end": words[-1]["end"],
                              "language": language, "words": words})
        return found

    result = recognize(0, len(audio) / 16000)
    speech = get_speech_timestamps(audio, VadOptions(min_silence_duration_ms=250, speech_pad_ms=150))
    # Un cambio de idioma puede cerrar prematuramente el texto del primer pase.
    # Recuperar sólo voz sin texto evita reemplazar una transcripción ya alineada.
    for _ in range(2):
        missing = uncovered_speech(speech, result)
        if not missing:
            break
        recovered = [segment for start, end in missing for segment in recognize(start, end)]
        if not recovered:
            break
        result = chronological_segments([*result, *recovered])
    if not result:
        raise ValueError("No se detectó voz. Prueba un archivo con audio claro.")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"segments": result,
        "timing_source": "whisperx_auto_recovery", "language_mode": "mixed", "model": model_name,
        "detected_languages": list(dict.fromkeys(languages)), "review_required": True,
        "uncovered_speech": uncovered_speech(speech, result)},
        ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Transcripción mixta lista. Revisa nombres y cambios de idioma.", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--language", default="mixed", choices=["es", "en", "mixed", "auto"])
    parser.add_argument("--vocabulary", default="")
    parser.add_argument("--model", default="turbo")
    parser.add_argument("--allow-model-download", action="store_true")
    args = parser.parse_args()
    transcribe(args.source.resolve(), args.output.resolve(), args.language,
               args.model, args.allow_model_download, args.vocabulary)


if __name__ == "__main__":
    main()
