import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeStream } from 'node:stream/web';
import { createHash, randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { CLOUD } from '../../_lib/supabase/config';
import { sameOrigin } from '../../_lib/request-security';
import { SessionError } from '../../_lib/localUploadSession';
import { brandDir, brandView, createBrandKit, readBrandKit, readBrandAnalysis, withBrandLock, writeBrandKit } from '../../_lib/brandKit';

export const runtime = 'nodejs';
const run = promisify(execFile);
const local = () => !CLOUD && !process.env.VERCEL;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
function failure(error: unknown) { return json({ error: error instanceof SessionError ? error.message : 'No se pudo guardar tu marca. Vuelve a intentarlo.' }, error instanceof SessionError ? error.status : 500); }
function authorize(request: Request) {
  if (!local()) throw new SessionError('Solo disponible en el estudio local.', 404);
  if (!sameOrigin(request)) throw new SessionError('Solicitud no permitida.', 403);
}
async function smallBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new SessionError('Faltan las opciones.', 400);
  let bytes = 0, text = ''; const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    bytes += value.byteLength;
    if (bytes > 4096) { await reader.cancel(); throw new SessionError('Las opciones son demasiado largas.', 413); }
    text += decoder.decode(value, { stream: true });
  }
  try { return JSON.parse(text + decoder.decode()); }
  catch { throw new SessionError('Las opciones no son válidas.', 400); }
}
export async function GET(request: Request) {
  if (!local()) return new Response(null, { status: 404 });
  try {
    const url = new URL(request.url), kit = await readBrandKit(url.searchParams.get('id') ?? '');
    if (url.searchParams.get('logo') === '1') {
      if (!kit.logo) return new Response(null, { status: 404 });
      const stream = createReadStream(path.join(brandDir(kit.id), kit.logo.file));
      return new Response(Readable.toWeb(stream) as ReadableStream, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    return json(await brandView(kit));
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { authorize(request); return json(await createBrandKit(), 201); }
  catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    authorize(request);
    const url = new URL(request.url), kind = url.searchParams.get('kind');
    if (kind !== 'logo' && kind !== 'reference') throw new SessionError('Elige logo o referencia.', 422);
    return await withBrandLock(request.headers.get('x-cutkind-brand') ?? '', async kit => {
      const dir = brandDir(kit.id), id = randomUUID(), pending = path.join(dir, `${id}.part`);
      const final = kind === 'logo' ? `${id}.png` : id;
      let committed = false;
      try {
        if (kind === 'reference' && (await readBrandAnalysis(kit))?.state === 'running') throw new SessionError('Espera a que termine el análisis antes de cambiar la referencia.', 409);
        if (!request.body) throw new SessionError('Selecciona un archivo.', 400);
        const maximum = (kind === 'logo' ? 10 : 300) * 1024 * 1024;
        const declared = Number(request.headers.get('content-length') ?? 0);
        if (declared > maximum) throw new SessionError(kind === 'logo' ? 'El logo admite hasta 10 MB.' : 'La referencia admite hasta 300 MB.', 413);
        let bytes = 0; const hash = createHash('sha256');
        const meter = new Transform({ transform(chunk: Buffer, _encoding, done) {
          bytes += chunk.length;
          if (bytes > maximum) return done(new SessionError('El archivo supera el tamaño permitido.', 413));
          hash.update(chunk); done(null, chunk);
        } });
        await pipeline(Readable.fromWeb(request.body as unknown as NodeStream), meter, createWriteStream(pending, { flags: 'wx', mode: 0o600 }));
        if (!bytes || (declared > 0 && bytes !== declared)) throw new SessionError('El archivo llegó vacío o incompleto.', 400);
        let metadata;
        try { metadata = JSON.parse((await run('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_streams', '-show_format', '-of', 'json', pending], { timeout: 15000, maxBuffer: 1024 * 1024 })).stdout); }
        catch { throw new SessionError('No se pudo leer el archivo. Revisa su formato.', 422); }
        const video = metadata.streams?.find((stream: { codec_type: string }) => stream.codec_type === 'video');
        const width = Number(video?.width), height = Number(video?.height), seconds = Number(metadata.format?.duration);
        if (!video || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width * height > 33_177_600) throw new SessionError('El archivo no contiene una imagen o video válido.', 422);
        const asset = { id, file: final, name: (url.searchParams.get('name') ?? kind).slice(0, 180), bytes, sha256: hash.digest('hex') };
        if (kind === 'logo') {
          if (!['png', 'mjpeg', 'webp'].includes(video.codec_name) || width > 4096 || height > 4096 || (Number.isFinite(seconds) && seconds > 1)) throw new SessionError('Usa un logo PNG, JPG o WebP de hasta 4096 píxeles.', 422);
          await run('ffmpeg', ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-i', pending, '-frames:v', '1', '-vf', "scale=w='min(1024,iw)':h='min(1024,ih)':force_original_aspect_ratio=decrease", path.join(dir, final)], { timeout: 30000 });
          await fs.chmod(path.join(dir, final), 0o600);
          const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', path.join(dir, final), '-vf', 'scale=64:64', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], { timeout: 15000, encoding: 'buffer', maxBuffer: 100_000 });
          const bins = new Map<string, { n: number; r: number; g: number; b: number }>();
          for (let i = 0; i < stdout.length; i += 4) {
            if (stdout[i + 3] < 192) continue;
            const [r, g, b] = [stdout[i], stdout[i + 1], stdout[i + 2]], key = [r, g, b].map(v => Math.floor(v / 32)).join(':');
            const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }; bin.n++; bin.r += r; bin.g += g; bin.b += b; bins.set(key, bin);
          }
          const colors = [...bins.values()].sort((a, b) => b.n - a.n).slice(0, 6).map(bin => '#' + [bin.r, bin.g, bin.b].map(value => Math.round(value / bin.n).toString(16).padStart(2, '0')).join(''));
          if (!colors.length) throw new SessionError('El logo es totalmente transparente. Selecciona una imagen visible.', 422);
          kit = { ...kit, logo: { ...asset, colors }, revision: kit.revision + 1 };
        } else {
          if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 180) throw new SessionError('El video de referencia debe durar hasta 3 minutos.', 422);
          await fs.rename(pending, path.join(dir, final));
          kit = { ...kit, reference: { ...asset, seconds }, selected: [], revision: kit.revision + 1 };
        }
        await writeBrandKit(kit); committed = true;
        return json(await brandView(kit));
      } finally {
        await fs.rm(pending, { force: true }).catch(() => {});
        if (!committed) await fs.rm(path.join(dir, final), { force: true }).catch(() => {});
      }
    });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  try {
    authorize(request); const body = await smallBody(request);
    return await withBrandLock(request.headers.get('x-cutkind-brand') ?? '', async kit => {
      const dir = brandDir(kit.id), analysis = await readBrandAnalysis(kit);
      if (body.action === 'analyze') {
        if (!kit.reference) throw new SessionError('Primero sube un video de referencia.', 422);
        if (analysis?.state === 'running') return json(await brandView(kit));
        if (analysis?.state === 'ready') return json(await brandView(kit));
        const target = path.join(dir, `analysis-${kit.reference.id}.json`);
        await fs.writeFile(target, JSON.stringify({ state: 'running', pid: process.pid }), { mode: 0o600 });
        try {
          const child = spawn('python3', ['scripts/brand_reference.py', dir, kit.reference.id], { cwd: process.cwd(), detached: true, stdio: 'ignore' });
          child.once('exit', () => {
            void fs.readFile(target, 'utf8').then(async text => {
              if (JSON.parse(text).state === 'running') {
                const temporary = target + '.failed.tmp';
                await fs.writeFile(temporary, JSON.stringify({ state: 'failed', error: 'El análisis se detuvo. Puedes volver a intentarlo.' }), { mode: 0o600 });
                await fs.rename(temporary, target);
              }
            }).catch(() => {});
          });
          await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
          child.unref();
        } catch { await fs.writeFile(target, JSON.stringify({ state: 'failed', error: 'No se pudo iniciar el análisis.' })); }
        return json(await brandView(kit));
      }
      if (body.action === 'select') {
        if (analysis?.state !== 'ready' || analysis.route !== 'reference' || body.referenceId !== kit.reference?.id || !Array.isArray(body.selected) || body.selected.length > 8 || body.selected.some((index: unknown) => !Number.isInteger(index) || (index as number) < 0 || analysis.patterns?.[index as number]?.implementation !== 'available')) throw new SessionError('Selecciona solo patrones disponibles del análisis actual.', 422);
        kit = { ...kit, selected: [...new Set<number>(body.selected)], revision: kit.revision + 1 };
      } else if (body.action === 'remove-logo') {
        kit = { ...kit, logo: undefined, revision: kit.revision + 1 };
      } else if (body.action === 'remove-reference') {
        if (analysis?.state === 'running') throw new SessionError('Espera a que termine el análisis.', 409);
        kit = { ...kit, reference: undefined, selected: [], revision: kit.revision + 1 };
      } else { throw new SessionError('La acción no es válida.', 422); }
      await writeBrandKit(kit); return json(await brandView(kit));
    });
  } catch (error) { return failure(error); }
}
