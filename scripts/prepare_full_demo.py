"""Prepara el discurso completo; sólo corta pausas entre tomas habladas."""

import argparse
import hashlib
import json
import math
import re
import subprocess
from pathlib import Path

from PIL import ImageFont

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parent
SOURCE = PROJECT / "public/client/pool-raw-full.mp4"
TRANSCRIPT = PROJECT / "local/raw-transcript.json"
CORRECTIONS = PROJECT / "local/corrections.json"
ALLOW_MODEL_DOWNLOAD = False


def save_json(path, value):
    """Escribe datos derivados locales, sin tocar el transcript original."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")


def normalize(text):
    return re.sub(r"[^\w]", "", text.casefold())


def source_frame_count(path, fps):
    """Mide el raw para no fijar el final de un video concreto."""
    seconds = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        check=True, text=True, capture_output=True).stdout
    return round(float(seconds) * fps)


def phrase_ranges(words, minimum_gap):
    """Agrupa todas las palabras; nunca selecciona ni reordena ideas."""
    ranges, start = [], 0
    for index in range(1, len(words)):
        if words[index]["start"] - words[index - 1]["end"] > minimum_gap:
            ranges.append((start, index))
            start = index
    ranges.append((start, len(words)))
    return ranges


def align_all_words(words, config, source_hash):
    """Reutiliza WhisperX local y valida una alineación por palabra original."""
    cache = PROJECT / "out/full-demo-alignment.json"
    transcript_hash = hashlib.sha256(TRANSCRIPT.read_bytes()).hexdigest()
    if cache.exists():
        previous = json.loads(cache.read_text(encoding="utf-8"))
        if (previous["source_sha256"] == source_hash
                and previous["transcript_sha256"] == transcript_hash):
            return previous["words"]

    import torch
    import whisperx

    torch.set_num_threads(4)
    audio = whisperx.load_audio(str(SOURCE))
    duration = len(audio) / 16000
    padding = config["edit"]["alignment_window_padding_seconds"]
    # Ventanas amplias protegen consonantes que el ASR situó demasiado tarde.
    windows = [
        {"start": max(0, words[first]["start"] - padding),
         "end": min(duration, words[last - 1]["end"] + padding),
         "text": " ".join(w["text"] for w in words[first:last])}
        for first, last in phrase_ranges(words, 2.0)
    ]
    print(f"Alineando localmente {len(words)} palabras en {len(windows)} frases.",
          flush=True)
    model, metadata = whisperx.load_align_model(
        language_code="es", device="cpu", model_cache_only=not ALLOW_MODEL_DOWNLOAD)
    result = whisperx.align(windows, model, metadata, audio, "cpu",
                            return_char_alignments=False, print_progress=True)
    aligned = result["word_segments"]
    if len(aligned) != len(words):
        raise ValueError("La alineación no conserva el número de palabras.")
    output = []
    for original, timing in zip(words, aligned):
        if normalize(original["text"]) != normalize(timing["word"]):
            raise ValueError("La alineación modificó una palabra.")
        if "start" not in timing or "end" not in timing:
            raise ValueError(f"Sin alineación: {original['text']}")
        output.append({**original, "start": timing["start"],
                       "end": timing["end"], "alignment_score": timing.get("score"),
                       "timing_source": "whisperx_local_forced_alignment"})
    save_json(cache, {"source_sha256": source_hash,
                      "transcript_sha256": transcript_hash, "words": output})
    return output


def token_width(text, face, settings):
    """Mide la misma fuente y tracking del navegador, sin reducir palabras."""
    return face.getlength(text) + len(text) * settings["font_size"] * settings[
        "letter_spacing_em"]


def layout_tokens(tokens, face, settings):
    lines, line, width = [], [], 0.0
    for token in tokens:
        size = token_width(token["text"], face, settings)
        if size > settings["max_width"]:
            raise ValueError(f"Palabra fuera de zona segura: {token['text']}")
        candidate = width + (settings["word_gap"] if line else 0) + size
        if line and candidate > settings["max_width"]:
            lines.append(line)
            line, width = [], 0.0
        width += (settings["word_gap"] if line else 0) + size
        line.append(token)
    if line:
        lines.append(line)
    return lines


def caption_pages(words, face, settings, source_end):
    """Elige los cortes de página; tamaño constante y máximo cuatro palabras."""
    # Una página termina cuando empieza la palabra siguiente. Se comparan todos
    # los cortes posibles para no cerrar con una palabra que apenas se vería,
    # luego evitar renglones de una palabra corta, después palabras sueltas y,
    # por último, usar menos páginas.
    count = len(words)
    # En habla rápida puede admitirse una palabra más, sólo si evita una fugaz.
    longest = settings.get("max_words_fast_speech", settings["max_words"])
    best = [(0, 0)] * (count + 1)
    for cursor in range(count - 1, -1, -1):
        options = []
        for size in range(1, min(longest, count - cursor) + 1):
            chosen = words[cursor:cursor + size]
            lines = layout_tokens(chosen, face, settings)
            if len(lines) > settings["max_lines"]:
                break
            last = cursor + size
            cost = 1 + best[last][0]
            if last < count:
                # Si el habla es rápida y no hay corte limpio, gana el menos breve.
                visible = (words[last]["source_start_frame"]
                           - chosen[-1]["source_start_frame"])
                cost += 100 * max(0, settings["min_last_word_frames"] - visible)
            if len(lines) > 1 and len(lines[-1]) == 1 and len(lines[-1][0]["text"]) <= 5:
                cost += 10
            if size > settings["max_words"]:
                cost += 50
            if size == 1 and not chosen[0]["text"].endswith((".", ",", ":", "?", "!")):
                cost += 5  # una palabra sola se lee como énfasis que nadie pidió
            options.append((cost, -size))
            if chosen[-1]["text"].endswith((".", ",", ":", "?", "!")):
                break
        if not options:
            raise ValueError("No se pudo componer el subtítulo.")
        cost, size = min(options)
        best[cursor] = (cost, -size)
    pages, cursor = [], 0
    while cursor < count:
        chosen = words[cursor:cursor + best[cursor][1]]
        pages.append({"start_frame": chosen[0]["source_start_frame"],
                      "lines": layout_tokens(chosen, face, settings)})
        cursor += len(chosen)
    for index, page in enumerate(pages):
        page["end_frame"] = (pages[index + 1]["start_frame"]
                             if index + 1 < len(pages) else source_end)
    return pages


def caption_face(config):
    return ImageFont.truetype(
        str(PROJECT / "public" / config["captions"]["font_file"]),
        config["captions"]["font_size"])


def write_srt(clips, fps):
    """Subtítulos externos con los mismos cambios de página que el video."""
    srt = []
    index = 1
    for clip in clips:
        for page in clip["pages"]:
            start = clip["timeline_in_frame"] + page["start_frame"] - clip["source_in_frame"]
            end = clip["timeline_in_frame"] + page["end_frame"] - clip["source_in_frame"]
            text = "\n".join(" ".join(w["text"] for w in line) for line in page["lines"])
            srt.append(f"{index}\n{srt_time(start, fps)} --> {srt_time(end, fps)}\n{text}\n")
            index += 1
    (PROJECT / "out/piscina-demo-completa.srt").write_text(
        "\n".join(srt), encoding="utf-8")


def repaginate(config):
    """Recalcula sólo las páginas del timeline existente, sin realinear la voz."""
    path = PROJECT / "src/pool-full-timeline.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    face = caption_face(config)
    for clip in data["clips"]:
        clip["pages"] = caption_pages(clip["words"], face, config["captions"],
                                      clip["source_out_frame"])
    save_json(path, data)
    save_json(PROJECT / "out/full-demo-edit-plan.json", data)
    write_srt(data["clips"], data["fps"])
    print(f"Páginas recalculadas: {sum(len(c['pages']) for c in data['clips'])} "
          f"en {len(data['clips'])} tomas.", flush=True)


def srt_time(frame, fps):
    milliseconds = round(frame * 1000 / fps)
    hours, milliseconds = divmod(milliseconds, 3600000)
    minutes, milliseconds = divmod(milliseconds, 60000)
    seconds, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"


def main():
    global SOURCE, TRANSCRIPT, ALLOW_MODEL_DOWNLOAD
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--transcript", type=Path, default=TRANSCRIPT)
    parser.add_argument("--allow-model-download", action="store_true")
    parser.add_argument("--pages-only", action="store_true",
                        help="Sólo recalcula captions del timeline existente.")
    args = parser.parse_args()
    SOURCE, TRANSCRIPT = args.source.resolve(), args.transcript.resolve()
    ALLOW_MODEL_DOWNLOAD = args.allow_model_download
    config = json.loads((PROJECT / "full-demo-config.json").read_text())
    fps = config["fps"]
    if args.pages_only:
        repaginate(config)
        return
    source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    transcript = json.loads(TRANSCRIPT.read_text(encoding="utf-8"))
    original = [
        {"id": f"pool_raw.word.{index:05d}", "text": word["word"].strip(),
         "start": word["start"], "end": word["end"]}
        for index, word in enumerate(
            word for segment in transcript["segments"] for word in segment["words"])
    ]
    # Correcciones ortográficas de cada video; se conserva la voz grabada.
    corrections = (json.loads(CORRECTIONS.read_text(encoding="utf-8"))
                   if CORRECTIONS.exists() else [])
    for item in corrections:
        index = item["index"]
        if index < len(original) and original[index]["text"] == item["expected"]:
            original[index]["text"] = item["replacement"]
    words = align_all_words(original, config, source_hash)
    face = caption_face(config)
    before = config["edit"]["speech_padding_before_seconds"]
    after = config["edit"]["speech_padding_after_seconds"]
    clips, offset, remapped_words = [], 0, []
    for number, (first, last) in enumerate(phrase_ranges(
            words, config["edit"]["minimum_pause_to_remove_seconds"]), 1):
        selected = words[first:last]
        source_in = max(0, math.floor((selected[0]["start"] - before) * fps))
        source_out = math.ceil((selected[-1]["end"] + after) * fps)
        if clips and source_in < clips[-1]["source_out_frame"]:
            raise ValueError("Los cortes se superponen.")
        local_words = [
            {**word, "source_start_frame": math.floor(word["start"] * fps),
             "source_end_frame": math.ceil(word["end"] * fps)}
            for word in selected
        ]
        for word in local_words:
            word["timeline_start_frame"] = offset + word["source_start_frame"] - source_in
            word["timeline_end_frame"] = offset + word["source_end_frame"] - source_in
            if not (source_in <= word["source_start_frame"]
                    < word["source_end_frame"] <= source_out):
                raise ValueError("Un corte toca una palabra hablada.")
        duration = source_out - source_in
        clips.append({"id": f"speech_{number:02}", "source_in_frame": source_in,
                      "source_out_frame": source_out, "duration_frames": duration,
                      "timeline_in_frame": offset,
                      "timeline_out_frame": offset + duration,
                      "words": local_words,
                      "pages": caption_pages(local_words, face,
                                             config["captions"], source_out)})
        remapped_words.extend(local_words)
        offset += duration
    assert [w["id"] for w in remapped_words] == [w["id"] for w in original]
    known_ids = {word["id"] for word in remapped_words}
    for event in config["graphics"]["events"] + config["audio"]["sfx"]:
        if event["anchor_word_id"] not in known_ids:
            raise ValueError(f"Evento sin palabra de anclaje: {event['id']}")
    removed = []
    previous_end = 0
    for clip in clips:
        if clip["source_in_frame"] > previous_end:
            removed.append({"start_frame": previous_end,
                            "end_frame": clip["source_in_frame"],
                            "reason": "no_aligned_speech_with_protected_word_edges"})
        previous_end = clip["source_out_frame"]
    removed.append({"start_frame": previous_end, "end_frame": source_frame_count(SOURCE, fps),
                    "reason": "trailing_no_speech"})
    data = {"fps": fps, "duration_frames": offset, "source_sha256": source_hash,
            "edit_mode": "all_speech_original_order", "clips": clips,
            "coverage": {"source_word_count": len(original),
                         "retained_word_count": len(remapped_words),
                         "omitted_word_ids": [], "original_order_preserved": True},
            "removed_ranges": removed}
    save_json(PROJECT / "src/pool-full-timeline.json", data)
    save_json(PROJECT / "out/full-demo-edit-plan.json", data)
    write_srt(clips, fps)
    print(f"Plan listo: {offset / fps:.2f}s, {len(clips)} tomas, "
          f"{len(remapped_words)}/{len(original)} palabras conservadas.", flush=True)
    for clip in clips:
        print(f"{clip['id']} {clip['source_in_frame'] / fps:.2f}–"
              f"{clip['source_out_frame'] / fps:.2f}: "
              + " ".join(w["text"] for w in clip["words"]), flush=True)


if __name__ == "__main__":
    main()
