import { readFile } from 'node:fs/promises';
import path from 'node:path';
import catalog from '../../../../style/catalog-v1.json';
export const runtime = 'nodejs';
// Only public, licensed catalog fonts; never accepts a filesystem path.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const font = catalog.fonts.find(item => item.id === id);
  if (!font) return new Response('Fuente desconocida', { status: 404 });
  const file = new URL(_request.url).searchParams.get('role') === 'caption' && font.captionFile ? font.captionFile : font.file;
  const bytes = await readFile(path.join(process.cwd(), 'public', file));
  return new Response(bytes, { headers: { 'Content-Type': 'font/ttf', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' } });
}
