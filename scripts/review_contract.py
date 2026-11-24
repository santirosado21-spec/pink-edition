"""Contratos puros del manifiesto de revisión; sin dependencias de render.

Las funciones de este módulo no importan PIL ni invocan ffmpeg/Remotion, así
que las pruebas de contrato corren en CI con la biblioteca estándar solamente.
"""


def word_frames(plan):
    """Misma regla que src/edit.ts: frame de la palabra en el montaje."""
    return {word["id"]: clip["timeline_in_frame"] + word["source_start_frame"]
            - clip["source_in_frame"]
            for clip in plan["clips"] for word in clip["words"]}


def resolve(event, plan, frames):
    if plan.get("is_sample"):
        return event.get("sample_frame", 0)
    return frames[event["anchor_word_id"]] + event["offset_frames"]


def source_frame_at(timeline, frame):
    """Clip y frame fuente de un frame del montaje; None si cae fuera."""
    for clip in timeline["clips"]:
        if clip["timeline_in_frame"] <= frame < clip["timeline_out_frame"]:
            return {"clip": clip["id"],
                    "source_frame": frame - clip["timeline_in_frame"]
                    + clip["source_in_frame"]}
    return None


def key_frames(timeline, style, plan):
    """Una muestra por subtítulo y fondo; tres por tarjeta.

    Cada item declara su tiempo de salida y su origen en la fuente, para que
    la revisión humana no tenga que reconstruir el mapeo a mano.
    """
    fps = timeline.get("fps") or style["fps"]
    frames = word_frames(timeline)
    reveal = style["captions"]["reveal_frames"]
    graphics = style["graphics"]
    cards = [(resolve(event, timeline, frames), event) for event in plan["cards"]]
    chosen = {}
    for clip in timeline["clips"]:
        shift = clip["timeline_in_frame"] - clip["source_in_frame"]
        for page in clip["pages"]:
            words = [word for line in page["lines"] for word in line]
            source = min(words[-1]["source_start_frame"] + reveal,
                         page["end_frame"] - 1)
            chosen[source + shift] = {
                "kind": "caption", "clip": clip["id"],
                "lines": [" ".join(w["text"] for w in line) for line in page["lines"]]}
    for start, event in cards:
        last = start + event["duration_frames"]
        for name, frame in [("card_enter", start + graphics["enter_frames"] // 2),
                            ("card_hold", start + event["duration_frames"] // 2),
                            ("card_exit", last - graphics["exit_frames"] - 1)]:
            chosen.setdefault(frame, {})["kind"] = name
    for event in plan["backgrounds"]:
        start = resolve(event, timeline, frames)
        chosen.setdefault(start + event["duration_frames"] // 2,
                          {"kind": "background_hold"})
    items = []
    for frame in sorted(chosen):
        item = {"frame": frame, **chosen[frame]}
        item["cards"] = [event["id"] for start, event in cards
                         if start <= frame < start + event["duration_frames"]]
        if "lines" not in item:
            item["lines"] = caption_at(timeline, frame)
        item["seconds"] = round(frame / fps, 3)
        source = source_frame_at(timeline, frame)
        item["source"] = None if source is None else {
            **source, "seconds": round(source["source_frame"] / fps, 3)}
        items.append(item)
    return items


def caption_at(plan, frame):
    for clip in plan["clips"]:
        source = frame - clip["timeline_in_frame"] + clip["source_in_frame"]
        if clip["timeline_in_frame"] <= frame < clip["timeline_out_frame"]:
            for page in clip["pages"]:
                if page["start_frame"] <= source < page["end_frame"]:
                    return [" ".join(w["text"] for w in line)
                            for line in page["lines"]]
    return []


def caption_warnings(timeline, style):
    """Avisa de palabras que casi no se ven y de renglones de una palabra corta."""
    warnings = []
    minimum_frames = style["captions"]["min_last_word_frames"]
    for clip in timeline["clips"]:
        shift = clip["timeline_in_frame"] - clip["source_in_frame"]
        for page in clip["pages"]:
            text = " / ".join(" ".join(w["text"] for w in line)
                              for line in page["lines"])
            for word in (w for line in page["lines"] for w in line):
                visible = page["end_frame"] - word["source_start_frame"]
                if visible < minimum_frames:
                    warnings.append({
                        "kind": "word_barely_visible", "word_id": word["id"],
                        "text": word["text"], "visible_frames": visible,
                        "frame": word["source_start_frame"] + shift, "page": text})
            last = page["lines"][-1]
            if len(page["lines"]) > 1 and len(last) == 1 and len(last[0]["text"]) <= 5:
                warnings.append({"kind": "orphan_line", "text": last[0]["text"],
                                 "frame": page["start_frame"] + shift, "page": text})
    return warnings


def uncertainty_gates(timeline):
    """Lo que este manifiesto NO verifica, declarado de forma explícita.

    Una revisión que no mide algo debe decir "unknown": la ausencia de un
    campo nunca puede leerse como verificado.
    """
    return {
        "face_placement": {
            "state": "unknown",
            "note": "Este manifiesto no mide rostros: la colocación sobre el "
                    "rostro queda para la medición facial (Mac) o la revisión "
                    "humana."},
        "voice_coverage": {
            "state": "unknown",
            "note": "La revisión de imagen no detecta voz sin texto; eso lo "
                    "cubre la QC de audio del pipeline."},
    }
