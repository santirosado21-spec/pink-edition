// Compatibility for older imports. All production inference now uses Sol.
import { SOL_EDITOR_MODEL, solEditorStatus, requestSolProposal } from './solEditor';
export const OLLAMA_EDITOR_MODEL = SOL_EDITOR_MODEL;
export const editorProvider = (): 'sol' => 'sol';
export const ollamaEditorStatus = solEditorStatus;
export const requestOllamaProposal = requestSolProposal;
