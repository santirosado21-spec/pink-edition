import type { Plan, Style, Timeline } from "./edit";
import { frameTransform, type Head } from "./zooms";

// Unión conservadora de la cabeza durante el intervalo, incluidos zoom y punch.
// Si no hay medición, no se presume un hueco seguro para superponer imágenes.
export function protectedHead(timeline: Pick<Timeline, "clips">, plan: Plan, style: Style, from: number, duration: number): Head | null {
  const clips = timeline.clips.filter(c => c.timeline_in_frame < from + duration && c.timeline_in_frame + c.duration_frames > from);
  if (!clips.length || clips.some(c => !c.face)) return null;
  const boxes = clips.flatMap(c => {
    const h = c.face!;
    if (![h.top, h.bottom, h.left, h.right].every(Number.isFinite) || h.bottom <= h.top || h.right <= h.left) return [];
    const zoom = Math.max(1, ...(plan.zooms ?? []).map(z => z.scale));
    const punch = (plan.take_transition ?? plan.preferences?.transition) === "punch" ? 1.06 : 1;
    const base = 1 + (plan.intro_blur ?? style.intro_blur).pixels / 400;
    const transform = frameTransform(c.head, base, zoom, punch, style);
    const scale = transform?.scale ?? base;
    const x = transform?.originX ?? style.width / 2, y = transform?.originY ?? style.height / 2;
    return [h, { left: x + (h.left - x) * scale, right: x + (h.right - x) * scale,
      top: y + (h.top - y) * scale, bottom: y + (h.bottom - y) * scale }];
  });
  if (boxes.length !== clips.length * 2) return null;
  return { left: Math.min(...boxes.map(b => b.left)) - 48, right: Math.max(...boxes.map(b => b.right)) + 48,
    top: Math.min(...boxes.map(b => b.top)) - 48, bottom: Math.max(...boxes.map(b => b.bottom)) + 48 };
}

export function safeCardTop(timeline: Pick<Timeline, "clips">, plan: Plan, style: Style, from: number, duration: number, preferred?: number): number | null {
  const face = protectedHead(timeline, plan, style, from, duration);
  if (!face) return null;
  const g = style.graphics, c = style.captions;
  const pad = 40, travel = Math.abs(g.enter_offset);
  const captionEnd = c.top + c.line_height * c.max_lines;
  const candidates = [preferred, captionEnd + pad * 2, face.bottom + pad, face.top - g.height - travel - pad, g.minimum_top];
  const intersects = (a: number, b: number, lo: number, hi: number) => a < hi && b > lo;
  for (const top of candidates) {
    if (top === undefined || !Number.isFinite(top)) continue;
    const y0 = top - pad, y1 = top + g.height + travel + pad;
    if (y0 < 40 || y1 > style.height - 80) continue;
    if (intersects(y0, y1, c.top - pad, captionEnd + pad)) continue;
    if (intersects(g.left - pad, g.left + g.width + pad, face.left, face.right) && intersects(y0, y1, face.top, face.bottom)) continue;
    return Math.round(top);
  }
  return null;
}
