import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Timeline } from "../../src/edit";
import type { Head } from "../../src/zooms";
const run = promisify(execFile);
const pending = new Map<string, Promise<Timeline>>();
type Measurement = { version: number; source_sha256?: string; clips: { id: string; source_in_frame: number; duration_frames: number; face: Head | null }[] };
export async function withFaceSafety(id: string, timeline: Timeline): Promise<Timeline> {
  if (process.platform !== "darwin" || process.env.VERCEL) return timeline;
  if (pending.has(id)) return pending.get(id)!;
  const operation = (async () => {
    const dir = path.join(process.cwd(), "work", id), file = path.join(dir, "face-safety.json");
    const valid = (m: Measurement) => m.version === 1 && m.source_sha256 === (timeline as Timeline & { source_sha256?: string }).source_sha256 && m.clips.length === timeline.clips.length && m.clips.every((c,i) => c.id === timeline.clips[i].id && c.source_in_frame === timeline.clips[i].source_in_frame && c.duration_frames === timeline.clips[i].duration_frames);
    let measurement: Measurement | undefined;
    try { const stored = JSON.parse(await fs.readFile(file, "utf8")); if (valid(stored)) measurement = stored; } catch { /* Se vuelve a medir. */ }
    try {
      if (!measurement) {
        await run("python3", ["scripts/face_safety.py", "--source", path.join(process.cwd(), "public", "work", id, "source.mp4"), "--timeline", path.join(dir,"timeline.json"), "--out",file], { cwd: process.cwd(), timeout: 120000 });
        const measured = JSON.parse(await fs.readFile(file,"utf8")); if (valid(measured)) measurement = measured;
      }
    } catch { /* Si falta visión, el renderer oculta overlays sin posición segura. */ }
    const result = { ...timeline, clips: timeline.clips.map((c,i) => ({ ...c, face: measurement?.clips[i].face ?? null })) };
    if (measurement && JSON.stringify(result) !== JSON.stringify(timeline)) {
      // El render del motor lee el mismo timeline que la vista previa.
      const timelineFile = path.join(dir, "timeline.json");
      const latest: Timeline = JSON.parse(await fs.readFile(timelineFile, "utf8"));
      if (JSON.stringify(latest) === JSON.stringify(timeline)) {
        const temp = path.join(dir, `timeline-faces-${process.pid}.tmp`);
        await fs.writeFile(temp, JSON.stringify(result, null, 2) + "\n"); await fs.rename(temp, timelineFile);
      }
    }
    return result;
  })();
  pending.set(id, operation);
  try { return await operation; } finally { pending.delete(id); }
}
