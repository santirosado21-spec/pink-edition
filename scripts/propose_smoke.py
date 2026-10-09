"""Prueba de humo de «Proponer con IA» contra la web en marcha."""

import argparse
import json
import urllib.error
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("job", help="Identificador del video en la web.")
parser.add_argument("--base", default="http://localhost:3000")
args = parser.parse_args()

request = urllib.request.Request(f"{args.base}/api/jobs/{args.job}/propose", method="POST")
try:
    with urllib.request.urlopen(request, timeout=300) as response:
        body = json.load(response)
except urllib.error.HTTPError as error:
    detail = json.load(error).get("error", "")
    raise SystemExit(f"Sin propuesta ({error.code}): {detail}")

plan = body["plan"]
timeline = json.load(urllib.request.urlopen(f"{args.base}/api/jobs/{args.job}", timeout=60))["timeline"]
words = {w["id"]: c["timeline_in_frame"] + w["source_start_frame"] - c["source_in_frame"]
         for c in timeline["clips"] for w in c["words"]}
events = [(group, e, words[e["anchor_word_id"]] + e["offset_frames"])
          for group in ("cuts", "cards", "backgrounds") for e in plan[group]]
problems = []
main = [item for item in events if item[0] != "backgrounds"]
for index, (_, a, start_a) in enumerate(main):
    for _, b, start_b in main[index + 1:]:
        if start_a < start_b + b["duration_frames"] and start_b < start_a + a["duration_frames"]:
            problems.append(f"se solapan «{a['label']}» y «{b['label']}»")
for _, _, start in events:
    crowd = sum(1 for _, _, other in events if start <= other < start + 300)
    if crowd > 4:
        problems.append(f"{crowd} elementos en 10 s desde el frame {start}")
        break
for group, event, start in events:
    if group == "cards" and event["kind"] == "counter" and not event.get("text"):
        problems.append(f"contador «{event['label']}» sin cifra dicha")
print(f"Propuesta: {len(plan['cuts'])} cortes, {len(plan['cards'])} tarjetas, {len(plan['backgrounds'])} fondos")
print("Notas del modelo:", body.get("notes", ""))
print("Problemas:", problems or "ninguno")
raise SystemExit(1 if problems else 0)
