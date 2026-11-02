// Compatibility imports must invoke the Sol transport, never Ollama.
import assert from 'node:assert/strict';
import path from 'node:path';
import { loader, root } from './test_support/load_ts.mjs';
let calls = 0;
const load = loader({ [path.join(root, 'app/_lib/solEditor')]: {
  SOL_EDITOR_MODEL: 'gpt-5.6-sol',
  requestSolProposal: async () => { calls++; throw new Error('Sol unavailable'); },
  solEditorStatus: async () => ({ ready: false, provider: 'OpenAI', model: 'gpt-5.6-sol' }),
}});
const legacy = load('app/_lib/ollamaEditor.ts');
assert.equal(legacy.editorProvider(), 'sol');
await assert.rejects(legacy.requestOllamaProposal('fixture', 'hash', {}, {}), /Sol unavailable/);
assert.equal(calls, 1);
console.log('PASS: old Ollama imports propagate Sol failures without an Ollama fallback.');
