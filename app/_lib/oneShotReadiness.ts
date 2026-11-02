import 'server-only';
import { ONE_SHOT_REQUIREMENTS } from '../../src/oneShotBrief';
// Capability of the local flow; each actual edit has its own resource/QC checks.
export function oneShotReadiness() {
  return { ready: true as boolean, requirements: ONE_SHOT_REQUIREMENTS, missing: [] as string[],
    error: '' };
}
