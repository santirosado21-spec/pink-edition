import 'server-only';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { EditorAiError, type EditorAiStatus } from './editorAi';

export const SOL_EDITOR_MODEL = 'gpt-5.6-sol';
type EditorialRequest = { system: string; messages: { role: 'user'; content: string; images?: string[] }[] };

function invoke(payload?: unknown): Promise<string> {
  if (process.env.VERCEL || process.env.CLOUD_ENGINE_ENABLED === 'true') throw new EditorAiError('Las pruebas con Sol sólo están disponibles en local.', 501);
  return new Promise((resolve, reject) => {
    const child = spawn('python3', [path.join(process.cwd(), 'scripts/sol_model.py'), ...(payload === undefined ? ['--status'] : [])], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '', bytes = 0, settled = false;
    const timer = setTimeout(() => { child.kill('SIGTERM'); fail('Sol tardó demasiado. Revisa la ejecución antes de reintentar.'); }, 330_000);
    const fail = (message: string) => { if (!settled) { settled = true; clearTimeout(timer); reject(new EditorAiError(message, 503)); } };
    child.on('error', () => fail('No se pudo iniciar el conector local de Sol.'));
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { bytes += Buffer.byteLength(chunk); if (bytes > 2_000_000) { child.kill(); fail('La respuesta supera el tamaño permitido.'); } else output += chunk; });
    child.stderr.resume(); // Los logs privados del proveedor no se devuelven a la interfaz.
    child.on('close', code => {
      if (settled) return;
      if (code !== 0) return fail('Sol no completó la solicitud. Comprueba que Codex tenga sesión con ChatGPT y uso disponible.');
      settled = true; clearTimeout(timer); resolve(output);
    });
    child.stdin.on('error', () => fail('No se pudo enviar la solicitud al conector local.'));
    child.stdin.end(payload === undefined ? undefined : JSON.stringify(payload));
  });
}

export async function solEditorStatus(fingerprint: string): Promise<EditorAiStatus> {
  try {
    const result = JSON.parse(await invoke());
    if (result.model !== SOL_EDITOR_MODEL || result.ready !== true) throw Error();
    return { ready: true, provider: 'OpenAI', model: SOL_EDITOR_MODEL, dataFingerprint: fingerprint,
      message: 'Sol configurado mediante tu sesión de ChatGPT en Codex. La disponibilidad del modelo se comprueba al proponer.' };
  } catch {
    return { ready: false, provider: 'OpenAI', model: SOL_EDITOR_MODEL, dataFingerprint: fingerprint,
      message: 'Inicia sesión en Codex con ChatGPT para usar Sol en las pruebas locales.' };
  }
}

export async function requestSolProposal(_job: string, _fingerprint: string, request: EditorialRequest, schema: Record<string, unknown>): Promise<string> {
  return invoke({ messages: [{ role: 'system', content: request.system }, ...request.messages], schema });
}
