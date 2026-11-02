import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { CLOUD } from '../../../_lib/supabase/config';
import { readUploadSession, sessionDir, SessionError } from '../../../_lib/localUploadSession';
import { readEdit, readRun } from '../../../_lib/localExecution';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (CLOUD || process.env.VERCEL) return new Response(null, { status: 404 });
  try {
    const url = new URL(request.url), id = url.searchParams.get('session') ?? '', asset = url.searchParams.get('asset') ?? '';
    await readUploadSession(id);
    const edit = await readEdit(id);
    const allowed = new Set([...(edit?.scenes.map(s => s.asset) ?? []), ...(edit?.assets.map(a => a.file) ?? [])]);
    if (asset === 'final.mp4' && (await readRun(id))?.state === 'exported') allowed.add(asset);
    if (!allowed.has(asset) || !/^[a-zA-Z0-9_-]+\.(mp4|wav|mp3|jpg|png)$/.test(asset)) return new Response(null, { status: 404 });
    const file = path.join(sessionDir(id), asset), stat = await fs.stat(file);
    let start = 0, end = stat.size - 1;
    const range = request.headers.get('range');
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
      if (!match[1]) start = Math.max(0, stat.size - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (start > end || start >= stat.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
    }
    const headers: Record<string, string> = { 'Content-Type': asset.endsWith('.mp4') ? 'video/mp4' : asset.endsWith('.wav') ? 'audio/wav' : asset.endsWith('.jpg') ? 'image/jpeg' : asset.endsWith('.png') ? 'image/png' : 'audio/mpeg', 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
    const callerOrigin = request.headers.get('origin');
    if (callerOrigin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(callerOrigin)) { headers['Access-Control-Allow-Origin'] = callerOrigin; headers['Access-Control-Expose-Headers'] = 'Content-Range, Content-Length, Accept-Ranges'; headers['Vary'] = 'Origin'; }
    if (range) headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    if (asset === 'final.mp4' && url.searchParams.get('download') === '1') headers['Content-Disposition'] = 'attachment; filename="cutkind-edicion.mp4"';
    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, { status: range ? 206 : 200, headers });
  } catch (error) { return new Response(null, { status: error instanceof SessionError ? error.status : 404 }); }
}
