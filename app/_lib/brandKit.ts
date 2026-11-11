import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { BrandKit, BrandSnapshot, ReferenceAnalysis } from '../../src/brandKit';
import type { Preferences } from '../../src/preferences';
import { SessionError } from './localUploadSession';

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export function brandDir(id: string) {
  if (!uuid.test(id)) throw new SessionError('La marca no es válida.', 422);
  return path.join(process.cwd(), 'work', 'brand-kits', id);
}
export async function readBrandKit(id: string): Promise<BrandKit> {
  try { return JSON.parse(await fs.readFile(path.join(brandDir(id), 'kit.json'), 'utf8')); }
  catch (error) { if (error instanceof SessionError) throw error; throw new SessionError('No se encontró esta marca. Vuelve a cargar tus archivos.', 404); }
}
export async function readBrandAnalysis(kit: BrandKit): Promise<ReferenceAnalysis | undefined> {
  if (!kit.reference) return;
  try {
    const analysis: ReferenceAnalysis = JSON.parse(await fs.readFile(path.join(brandDir(kit.id), `analysis-${kit.reference.id}.json`), 'utf8'));
    if (analysis.state === 'running') {
      try { if (!analysis.pid) throw Error(); process.kill(analysis.pid, 0); }
      catch { return { state: 'failed', error: 'El análisis se detuvo. Puedes volver a analizar la referencia.' }; }
    }
    return analysis;
  } catch { return; }
}
export async function brandView(kit: BrandKit) { return { ...kit, analysis: await readBrandAnalysis(kit) }; }
export async function writeBrandKit(kit: BrandKit) {
  const dir = brandDir(kit.id);
  await fs.mkdir(path.join(dir, 'history'), { recursive: true, mode: 0o700 });
  // Revisions preserve prior selections and asset records without altering originals.
  const text = JSON.stringify(kit);
  await fs.writeFile(path.join(dir, 'history', `${kit.revision}.json`), text, { flag: 'wx', mode: 0o600 });
  const temporary = path.join(dir, `${randomUUID()}.tmp`);
  await fs.writeFile(temporary, text, { mode: 0o600 });
  await fs.rename(temporary, path.join(dir, 'kit.json'));
}
export async function createBrandKit() {
  const kit: BrandKit = { id: randomUUID(), revision: 1, selected: [] };
  await writeBrandKit(kit); return kit;
}
export async function withBrandLock<T>(id: string, action: (kit: BrandKit) => Promise<T>) {
  await readBrandKit(id);
  const lockPath = path.join(brandDir(id), 'write.lock');
  let lock;
  try {
    try { lock = await fs.open(lockPath, 'wx', 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const previous = await fs.readFile(lockPath, 'utf8').then(text => JSON.parse(text)).catch(() => null);
      let dead = false;
      if (Number.isInteger(previous?.pid) && previous.pid > 0) {
        try { process.kill(previous.pid, 0); } catch (problem) { dead = (problem as NodeJS.ErrnoException).code === 'ESRCH'; }
      }
      if (!dead) throw error;
      await fs.rm(lockPath, { force: true });
      lock = await fs.open(lockPath, 'wx', 0o600);
    }
    await lock.writeFile(JSON.stringify({ pid: process.pid }));
  }
  catch { throw new SessionError('Hay una operación de marca en curso. Inténtalo de nuevo.', 409); }
  try { return await action(await readBrandKit(id)); }
  finally { await lock.close(); await fs.rm(lockPath, { force: true }); }
}
export async function snapshotBrand(id: string, destination: string, editorial?: Preferences['editorial']): Promise<BrandSnapshot> {
  return withBrandLock(id, async kit => {
    const analysis = await readBrandAnalysis(kit);
    if (analysis?.state === 'running') throw new SessionError('Espera a que termine el análisis de tu referencia.', 409);
    const patterns = kit.reference && analysis?.state === 'ready' && analysis.route === 'reference'
      ? (analysis.patterns ?? []).filter((pattern, index) => kit.selected.includes(index) && pattern.implementation === 'available'
        && (pattern.editorialVersion !== 1 || (editorial?.version === 1 && !!pattern.aspect && editorial.referenceAspects.includes(pattern.aspect))))
        .map(pattern => ({ ...pattern, sourceSha256: kit.reference!.sha256, userApproval: 'liked' as const })) : [];
    const logo = kit.logo ? { ...kit.logo, file: 'brand-logo.png' } : undefined;
    if (logo) await fs.copyFile(path.join(brandDir(id), kit.logo!.file), path.join(destination, logo.file));
    return { kitId: id, revision: kit.revision, logo, patterns };
  });
}
