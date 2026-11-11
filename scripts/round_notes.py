#!/usr/bin/env python3
"""Notas de ronda: hasta 5 viñetas (fallos, avisos, tiempos) verificadas contra quality.json.

Uso:
    python3 scripts/round_notes.py <ronda>   # nombre bajo PINK_LOOP_ROUNDS o ruta directa

Los hechos salen de los quality.json y render.log de la ronda. Si hay un
resumidor (`localllm` en PATH o PINK_NOTES_CMD) redacta las viñetas, pero no
decide nada: cada número y cada título citado debe existir en los hechos
extraídos o la viñeta se descarta. Sin resumidor disponible se escribe un
resumen determinista con los mismos hechos.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
ROUNDS = Path(os.environ.get("PINK_LOOP_ROUNDS", ROOT / "work" / "fran-loop"))

QC_KEYS = ("audioQc", "fullVoiceQc", "visualModelReview")
TIMING_RE = re.compile(r"(seconds|minutes|elapsed|duration|secs|mins)", re.IGNORECASE)
NUMBER_RE = re.compile(r"\d+(?:[.,]\d+)?")
QUOTED_RE = re.compile(r"«([^»]+)»")


def load(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def find_timings(value: Any, prefix: str = "") -> dict[str, float]:
    """Claves con tiempos numéricos, aplanadas: 'run.elapsedSeconds': 42.0."""
    found: dict[str, float] = {}
    if isinstance(value, dict):
        for key, item in value.items():
            found.update(find_timings(item, f"{prefix}{key}."))
    elif isinstance(value, (int, float)) and not isinstance(value, bool) and TIMING_RE.search(prefix):
        found[prefix.rstrip(".")] = round(float(value), 2)
    return found


def collect_facts(round_dir: Path) -> list[dict[str, Any]]:
    facts = []
    for quality_path in sorted(round_dir.glob("video-*/quality.json")):
        quality = load(quality_path)
        target = quality_path.parent
        checks = quality.get("checks")
        failing = (
            [key for key, value in checks.items() if value is not True]
            if isinstance(checks, dict)
            else (["checks sin formato"] if checks is not None else [])
        )
        qc = {}
        for key in QC_KEYS:
            review = quality.get(key)
            if isinstance(review, dict) and "exitCode" in review:
                qc[key] = review["exitCode"]
        if "reviewRenderExitCode" in quality:
            qc["reviewRenderExitCode"] = quality["reviewRenderExitCode"]
        log_path = target / "render.log"
        log_text = ""
        if log_path.is_file():
            log_text = log_path.read_text(encoding="utf-8", errors="replace")[-20000:]
        facts.append(
            {
                "video": target.name,
                "titulo": quality.get("title") or target.name,
                "checks_fallidos": failing,
                "issues_editoriales": len(quality.get("editorialIssues") or []),
                "qc_exit_codes": qc,
                "durationSeconds": quality.get("durationSeconds"),
                "tiempos": find_timings(quality),
                "render_log_errores": len(re.findall(r"(?i)\berror\b|traceback|failed", log_text)),
                "render_log_avisos": len(re.findall(r"(?i)\bwarn(?:ing)?\b", log_text)),
            }
        )
    return facts


def deterministic_bullets(facts: list[dict[str, Any]]) -> list[str]:
    bullets = []
    failing = [f for f in facts if f["checks_fallidos"] or f["issues_editoriales"]]
    bad_qc = [f for f in facts if any(code not in (0, None) for code in f["qc_exit_codes"].values())]
    if failing:
        parts = []
        for f in failing:
            reason = ", ".join(f["checks_fallidos"]) or f"{f['issues_editoriales']} issues editoriales"
            parts.append(f"«{f['titulo']}»: {reason}")
        detail = "; ".join(parts)
        bullets.append(f"Fallos: {detail}.")
    else:
        bullets.append("Fallos: ninguno en los checks ni en las reglas editoriales.")
    if bad_qc:
        detail = "; ".join(
            f"«{f['titulo']}» ({', '.join(f'{k}={v}' for k, v in f['qc_exit_codes'].items() if v not in (0, None))})"
            for f in bad_qc
        )
        bullets.append(f"QC con salida distinta de cero: {detail}.")
    logged_errors = [f for f in facts if f["render_log_errores"]]
    if logged_errors:
        detail = ", ".join(f"«{f['titulo']}» ({f['render_log_errores']})" for f in logged_errors)
        bullets.append(f"Avisos: líneas de error en render.log de {detail}.")
    durations = [f for f in facts if isinstance(f.get("durationSeconds"), (int, float))]
    if durations:
        detail = ", ".join(f"«{f['titulo']}» {f['durationSeconds']} s" for f in durations)
        bullets.append(f"Duraciones: {detail}.")
    timings = [(f, key, value) for f in facts for key, value in f["tiempos"].items()]
    if timings:
        detail = "; ".join(f"«{f['titulo']}» {key}={value}" for f, key, value in timings[:4])
        bullets.append(f"Tiempos: {detail}.")
    return bullets[:5] or ["Sin hechos suficientes en la ronda."]


def facts_payload(facts: list[dict[str, Any]]) -> str:
    return json.dumps(facts, ensure_ascii=False, sort_keys=True)


def fact_numbers(value: Any) -> set[str]:
    """Formas canónicas de cada número de los hechos: ni subcadenas ni aproximados."""
    numbers: set[str] = set()
    if isinstance(value, bool):
        return numbers
    if isinstance(value, (int, float)):
        numbers.add(json.dumps(value))
    elif isinstance(value, dict):
        for item in value.values():
            numbers.update(fact_numbers(item))
    elif isinstance(value, list):
        for item in value:
            numbers.update(fact_numbers(item))
    return numbers


def verify_bullet(bullet: str, numbers: set[str], titles: list[str]) -> bool:
    """Cada número citado debe ser un hecho exacto y cada título, uno real y completo."""
    for raw in NUMBER_RE.findall(bullet):
        candidate = raw.replace(",", ".")
        equivalents = {candidate, candidate + ".0"}
        if candidate.endswith(".0"):
            equivalents.add(candidate[:-2])
        if not equivalents & numbers:
            return False
    for quoted in QUOTED_RE.findall(bullet):
        if quoted not in titles:
            return False
    return True


def call_summarizer(payload: str) -> str | None:
    command = os.environ.get("PINK_NOTES_CMD") or shutil.which("localllm")
    if not command:
        return None
    prompt = (
        "Escribe hasta 5 viñetas en español sobre estos hechos de una ronda de edición: "
        "fallos, avisos y tiempos. Usa sólo números y títulos que aparecen en el JSON; "
        "cita los títulos entre «». No inventes causas ni porcentajes.\n" + payload
    )
    try:
        result = subprocess.run(
            [command, prompt], capture_output=True, text=True, check=False, timeout=300
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        print(f"Aviso: el resumidor no respondió ({error}); se usa el resumen determinista.", file=sys.stderr)
        return None
    if result.returncode != 0 or not result.stdout.strip():
        print("Aviso: el resumidor falló; se usa el resumen determinista.", file=sys.stderr)
        return None
    return result.stdout


def summarize(facts: list[dict[str, Any]]) -> tuple[list[str], list[str]]:
    """Devuelve (viñetas verificadas, viñetas descartadas)."""
    payload = facts_payload(facts)
    numbers = fact_numbers(facts)
    titles = [str(f["titulo"]) for f in facts]
    text = call_summarizer(payload)
    if text is None:
        return deterministic_bullets(facts), []
    candidates = [line.strip("-•* \t") for line in text.splitlines() if line.strip("-•* \t")]
    verified = [line for line in candidates if verify_bullet(line, numbers, titles)]
    discarded = [line for line in candidates if line not in verified]
    if not verified:
        print("Aviso: ninguna viñeta del resumidor se pudo verificar; se usa el determinista.", file=sys.stderr)
        return deterministic_bullets(facts), discarded
    return verified[:5], discarded


def resolve_round(name: str) -> Path:
    candidate = Path(name)
    if candidate.is_dir():
        return candidate
    candidate = ROUNDS / name
    if candidate.is_dir():
        return candidate
    raise SystemExit(f"No se encontró la ronda: {name}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("round", help="Nombre de la ronda bajo PINK_LOOP_ROUNDS o ruta directa")
    parser.add_argument("--output", help="Ruta del notes.md (por defecto dentro de la ronda)")
    args = parser.parse_args()

    round_dir = resolve_round(args.round)
    facts = collect_facts(round_dir)
    if not facts:
        print(f"La ronda {round_dir.name} no tiene video-*/quality.json.", file=sys.stderr)
        return 1
    bullets, discarded = summarize(facts)
    for line in discarded:
        print(f"Descartada por no verificable: {line}", file=sys.stderr)
    output = Path(args.output) if args.output else round_dir / "notes.md"
    body = "\n".join(f"- {bullet}" for bullet in bullets) + "\n"
    output.write_text(f"# Notas de la ronda {round_dir.name}\n\n{body}", encoding="utf-8")
    print(f"Notas escritas en {output} ({len(bullets)} viñetas verificadas).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
