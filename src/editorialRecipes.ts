import catalog from '../style/editorial-recipes-v1.json';
import type {Preferences} from './preferences';
import type {EditBeat} from './oneShotEdit';
export const editorialFamilies = catalog.families;
export const editorialFamily = (prefs: Preferences) => editorialFamilies.find(f=>f.id===prefs.editorialFamilyId);
export function editorialVariant(beat: EditBeat, prefs: Preferences) {
  const family=editorialFamily(prefs);
  const allowed=beat.kind==='card' ? ['mask','line-reveal','chapter','underline','quote','word-accent'] : beat.kind==='broll' ? ['framed','split'] : beat.kind==='compare' ? ['comparison'] : ['idea-map'];
  if (beat.variantId && !allowed.includes(beat.variantId)) throw Error(`Variante incompatible: ${beat.variantId}/${beat.kind}`);
  return beat.variantId ?? (beat.kind==='card' ? family?.cards[0] ?? 'quote' : beat.kind==='broll' ? family?.broll[0] ?? 'framed' : beat.kind==='compare' ? 'comparison' : 'idea-map');
}
