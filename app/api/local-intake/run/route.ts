import { CLOUD } from '../../../_lib/supabase/config';
import { sameOrigin } from '../../../_lib/request-security';
import { readUploadSession, SessionError } from '../../../_lib/localUploadSession';
import { executeSession, readEdit, readRun } from '../../../_lib/localExecution';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (CLOUD || process.env.VERCEL) return new Response(null, { status: 404 });
  try {
    const id = request.headers.get('x-cutkind-session') ?? '';
    const session = await readUploadSession(id);
    return Response.json({ session, run: await readRun(id), edit: await readEdit(id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return Response.json({ error: (error as Error).message }, { status: error instanceof SessionError ? error.status : 500 }); }
}
export async function POST(request: Request) {
  if (CLOUD || process.env.VERCEL) return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 65536) throw new SessionError('Solicitud demasiado grande.', 413);
    const { order, action } = JSON.parse(raw);
    if (!Array.isArray(order) || order.some(id => typeof id !== 'string') || !['edit', 'export'].includes(action)) throw new SessionError('Solicitud inválida.', 422);
    return Response.json(await executeSession(request.headers.get('x-cutkind-session') ?? '', order, action, new URL(request.url).origin));
  } catch (error) { return Response.json({ error: error instanceof SessionError ? error.message : 'No se pudo iniciar la edición local.' }, { status: error instanceof SessionError ? error.status : 500 }); }
}
