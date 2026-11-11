#!/usr/bin/env python3
"""Añade clips crudos al corpus local de evaluación, sin modificar el original."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from collections import Counter
from typing import Any
from urllib.parse import urlparse
import re


MAX_PER_SPLIT = 6
MAX_CLIPS = MAX_PER_SPLIT * 2
ALLOWED_LICENSES = {
    "propio",
    "CC0",
    "CC-BY-4.0",
    "CC-BY-3.0",
    "pexels",
    "pixabay",
    "autorizado-por-escrito",
}
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


class CorpusError(Exception):
    """Un dato no cumple el contrato del corpus."""


def corpus_dir() -> Path:
    configured = os.environ.get("PINK_CORPUS_DIR")
    if configured:
        return Path(configured).expanduser()
    return Path(__file__).resolve().parent.parent / "work" / "corpus"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_manifest(directory: Path) -> list[dict[str, Any]]:
    manifest = directory / "manifest.jsonl"
    if not manifest.exists():
        return []
    rows: list[dict[str, Any]] = []
    with manifest.open(encoding="utf-8") as handle:
        for number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as error:
                raise CorpusError(f"El manifiesto tiene JSON inválido en la línea {number}.") from error
            if not isinstance(row, dict):
                raise CorpusError(f"El manifiesto tiene una entrada inválida en la línea {number}.")
            rows.append(row)
    return rows


def validate_source(source: str) -> None:
    if source == "propio":
        return
    parsed = urlparse(source)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return
    raise CorpusError("La fuente debe ser «propio» o una URL http(s) válida.")


def validate_license(license_id: str) -> None:
    if not license_id.strip():
        raise CorpusError("La licencia no puede estar vacía.")
    upper = license_id.upper()
    if "NC" in upper or "ND" in upper:
        raise CorpusError(
            "Las licencias NC o ND no permiten el uso comercial o las obras derivadas."
        )
    if license_id not in ALLOWED_LICENSES:
        allowed = ", ".join(sorted(ALLOWED_LICENSES))
        raise CorpusError(f"Licencia no admitida. Use una de: {allowed}.")


def fraction_to_fps(value: str | None) -> float | None:
    if not value or value == "0/0":
        return None
    try:
        numerator, denominator = value.split("/", 1)
        denominator_number = float(denominator)
        if denominator_number == 0:
            return None
        return float(numerator) / denominator_number
    except (ValueError, ZeroDivisionError):
        return None


PROBE_ENTRIES = (
    "format=duration:stream=codec_type,width,height,avg_frame_rate,r_frame_rate:stream_tags=rotate"
)


def probe_media(path: Path) -> dict[str, Any]:
    def run_probe(entries: str) -> subprocess.CompletedProcess[str]:
        command = ["ffprobe", "-v", "error", "-show_entries", entries, "-of", "json", str(path)]
        try:
            return subprocess.run(command, capture_output=True, text=True, check=False)
        except FileNotFoundError as error:
            raise CorpusError("No se encontró ffprobe; es necesario para inspeccionar el clip.") from error

    # ffprobe < 5 no conoce la sección stream_side_data: se reintenta sin ella y
    # la rotación se lee sólo de la etiqueta rotate, si existe.
    result = run_probe(f"{PROBE_ENTRIES}:stream_side_data=rotation")
    if result.returncode != 0 and "side_data" in result.stderr:
        result = run_probe(PROBE_ENTRIES)
    if result.returncode != 0:
        detail = result.stderr.strip() or "ffprobe no pudo leer el archivo."
        raise CorpusError(f"No se pudo inspeccionar el clip: {detail}")
    try:
        data = json.loads(result.stdout)
        streams = data.get("streams", [])
        duration = float(data["format"]["duration"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise CorpusError("ffprobe no devolvió metadatos válidos de duración.") from error

    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    if not isinstance(video, dict):
        raise CorpusError("El archivo no tiene pista de video.")
    try:
        width = int(video["width"])
        height = int(video["height"])
    except (KeyError, TypeError, ValueError) as error:
        raise CorpusError("ffprobe no devolvió dimensiones válidas.") from error

    rotation_value = video.get("tags", {}).get("rotate", 0)
    for side_data in video.get("side_data_list", []) or []:
        if isinstance(side_data, dict) and "rotation" in side_data:
            rotation_value = side_data["rotation"]
            break
    try:
        rotation = int(round(float(rotation_value))) % 360
    except (TypeError, ValueError):
        rotation = 0
    effective_width, effective_height = (height, width) if rotation in {90, 270} else (width, height)
    fps = fraction_to_fps(video.get("avg_frame_rate")) or fraction_to_fps(video.get("r_frame_rate"))
    has_audio = any(stream.get("codec_type") == "audio" for stream in streams)
    orientation = "portrait" if effective_height > effective_width else "landscape"
    return {
        "duration": duration,
        "width": width,
        "height": height,
        "rotation": rotation,
        "fps": fps,
        "hasAudio": has_audio,
        "orientation": orientation,
        "needsCrop": orientation != "portrait",
    }


def choose_split(rows: list[dict[str, Any]], digest: str, requested: str | None) -> str:
    counts = Counter(str(row.get("split")) for row in rows)
    if len(rows) >= MAX_CLIPS:
        raise CorpusError("El corpus ya está completo (12 clips); no se pueden registrar más.")
    if requested:
        if counts[requested] >= MAX_PER_SPLIT:
            raise CorpusError(f"El cupo de {requested} ya está lleno (6 clips).")
        return requested
    preferred = "holdout" if int(digest[:8], 16) % 2 == 1 else "dev"
    alternate = "dev" if preferred == "holdout" else "holdout"
    if counts[preferred] < MAX_PER_SPLIT:
        return preferred
    if counts[alternate] < MAX_PER_SPLIT:
        return alternate
    raise CorpusError("Los cupos de dev y holdout ya están llenos.")


def infer_topic(transcript: Path) -> tuple[str | None, str | None]:
    try:
        transcript_text = transcript.read_text(encoding="utf-8")
    except OSError as error:
        raise CorpusError(f"No se pudo leer la transcripción: {error}") from error
    prompt = (
        "Extrae el tema principal y el idioma de esta transcripción. "
        "Devuelve únicamente JSON con {\"topic\": str, \"language\": str}.\n\n"
        + transcript_text
    )
    try:
        result = subprocess.run(
            ["localllm", "--json", prompt], capture_output=True, text=True, check=False
        )
    except FileNotFoundError:
        print("Aviso: localllm no está disponible; el tema queda vacío.", file=sys.stderr)
        return None, None
    if result.returncode == 2:
        print("Aviso: localllm no está disponible; el tema queda vacío.", file=sys.stderr)
        return None, None
    if result.returncode != 0:
        print("Aviso: localllm falló; el tema queda vacío.", file=sys.stderr)
        return None, None
    try:
        payload = json.loads(result.stdout)
        topic = payload["topic"]
        language = payload["language"]
        if not isinstance(topic, str) or not isinstance(language, str):
            raise ValueError("tipos inválidos")
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        print("Aviso: localllm devolvió JSON inválido; el tema queda vacío.", file=sys.stderr)
        return None, None
    return topic[:60], "gemma"


def append_manifest(directory: Path, record: dict[str, Any]) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    manifest = directory / "manifest.jsonl"
    encoded = json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
    with manifest.open("a", encoding="utf-8") as handle:
        handle.write(encoded)
        handle.flush()
        os.fsync(handle.fileno())


def verify_corpus() -> int:
    """Comprueba la trazabilidad del corpus sin cambiar clips ni manifiesto."""
    directory = corpus_dir().resolve()
    rows = read_manifest(directory)
    seen_hashes: set[str] = set()
    seen_files: set[Path] = set()
    counts: Counter[str] = Counter()
    for number, row in enumerate(rows, 1):
        digest = row.get("sha256")
        if not isinstance(digest, str) or not SHA256_RE.fullmatch(digest):
            raise CorpusError(f"Línea {number}: sha256 inválido.")
        if digest in seen_hashes:
            raise CorpusError(f"Línea {number}: sha256 duplicado en el manifiesto.")
        seen_hashes.add(digest)
        source = row.get("source")
        license_id = row.get("license")
        split = row.get("split")
        if not isinstance(source, str):
            raise CorpusError(f"Línea {number}: fuente inválida.")
        if not isinstance(license_id, str):
            raise CorpusError(f"Línea {number}: licencia inválida.")
        validate_source(source)
        validate_license(license_id)
        if split not in {"dev", "holdout"}:
            raise CorpusError(f"Línea {number}: split inválido; use dev u holdout.")
        counts[split] += 1
        if counts[split] > MAX_PER_SPLIT:
            raise CorpusError(f"Línea {number}: el split {split} supera su cupo de {MAX_PER_SPLIT} clips.")
        relative = row.get("file")
        if not isinstance(relative, str) or not relative:
            raise CorpusError(f"Línea {number}: ruta del clip inválida.")
        clip = (directory / relative).resolve()
        try:
            clip.relative_to(directory / "raw")
        except ValueError as error:
            raise CorpusError(f"Línea {number}: el clip debe vivir dentro de raw/.") from error
        if clip in seen_files:
            raise CorpusError(f"Línea {number}: ruta de clip duplicada en el manifiesto.")
        seen_files.add(clip)
        if not clip.is_file():
            raise CorpusError(f"Línea {number}: falta el clip copiado {relative}.")
        if sha256_file(clip) != digest:
            raise CorpusError(f"Línea {number}: el hash de {relative} ya no coincide con el manifiesto.")
    print(f"Corpus verificado: {len(rows)} clips · dev={counts['dev']} · holdout={counts['holdout']}.")
    return 0


def add_clip(args: argparse.Namespace) -> int:
    original = Path(args.file).expanduser()
    if not original.is_file():
        raise CorpusError("El archivo indicado no existe o no es un archivo regular.")
    validate_source(args.source)
    validate_license(args.license)
    directory = corpus_dir()
    rows = read_manifest(directory)
    digest = sha256_file(original)
    if any(row.get("sha256") == digest for row in rows):
        raise CorpusError("Este clip ya está registrado en el manifiesto.")
    metadata = probe_media(original)
    if not metadata["hasAudio"]:
        raise CorpusError("El clip no tiene pista de audio.")
    if not 20 <= metadata["duration"] <= 120:
        raise CorpusError("La duración debe estar entre 20 y 120 segundos.")
    split = choose_split(rows, digest, args.split)

    if args.topic is not None:
        topic, topic_source = args.topic, "provided"
    elif args.transcript:
        topic, topic_source = infer_topic(Path(args.transcript).expanduser())
    else:
        topic, topic_source = None, None

    extension = original.suffix
    destination_relative = Path("raw") / f"{digest[:12]}{extension}"
    destination = directory / destination_relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        shutil.copy2(original, destination)
    except OSError as error:
        raise CorpusError(f"No se pudo copiar el clip al corpus: {error}") from error
    if sha256_file(destination) != digest:
        try:
            destination.unlink()
        except OSError:
            pass
        raise CorpusError("La copia no coincide con el hash del original; no se registró.")

    record = {
        "sha256": digest,
        "file": destination_relative.as_posix(),
        "originalName": original.name,
        "source": args.source,
        "license": args.license,
        "split": split,
        "topic": topic,
        "topicSource": topic_source,
        **metadata,
        "addedAt": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    try:
        append_manifest(directory, record)
    except OSError as error:
        raise CorpusError(f"No se pudo escribir el manifiesto: {error}") from error
    print(f"Registrado {original.name} en {split}: {destination_relative.as_posix()}")
    return 0


def list_corpus() -> int:
    rows = read_manifest(corpus_dir())
    counts = Counter(str(row.get("split")) for row in rows)
    licenses = Counter(str(row.get("license")) for row in rows)
    topics = {row.get("topic") for row in rows if isinstance(row.get("topic"), str) and row["topic"].strip()}
    print("ARCHIVO\tSPLIT\tLICENCIA\tTEMA")
    for row in rows:
        print(
            f"{row.get('originalName', '')}\t{row.get('split', '')}\t"
            f"{row.get('license', '')}\t{row.get('topic') or ''}"
        )
    print(f"\nTotal: {len(rows)}")
    print(f"Por split: dev={counts['dev']}, holdout={counts['holdout']}")
    print("Por licencia: " + (", ".join(f"{key}={value}" for key, value in sorted(licenses.items())) or "ninguna"))
    print(f"Temas distintos: {len(topics)}")
    print(f"Faltan {max(0, MAX_PER_SPLIT - counts['dev'])} para dev / {max(0, MAX_PER_SPLIT - counts['holdout'])} para holdout")
    if len(topics) < 5:
        print("Aviso: hay menos de 5 temas distintos.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Registra clips crudos en el corpus local.")
    parser.add_argument("file", nargs="?", help="Clip que se registrará, o «list»/«verify».")
    parser.add_argument("--source", help="URL http(s) de origen o «propio».")
    parser.add_argument("--license", dest="license", help="Identificador de licencia.")
    parser.add_argument("--topic", help="Tema explícito del clip.")
    parser.add_argument("--transcript", help="Ruta local de una transcripción de texto.")
    parser.add_argument("--split", choices=("dev", "holdout"), help="Split que se reservará.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        if args.file == "list":
            if any((args.source, args.license, args.topic, args.transcript, args.split)):
                raise CorpusError("El comando list no acepta opciones de alta.")
            return list_corpus()
        if args.file == "verify":
            if any((args.source, args.license, args.topic, args.transcript, args.split)):
                raise CorpusError("El comando verify no acepta opciones de alta.")
            return verify_corpus()
        if not args.file:
            raise CorpusError("Indique un archivo o use «list».")
        if args.source is None or args.license is None:
            raise CorpusError("Para registrar un clip son obligatorios --source y --license.")
        if args.topic is not None and args.transcript is not None:
            raise CorpusError("Use --topic o --transcript, no ambos.")
        return add_clip(args)
    except CorpusError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
