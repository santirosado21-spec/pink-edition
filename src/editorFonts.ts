import catalog from '../style/catalog-v1.json';
export const editorFont = (id?: string, caption = false) => {
  const font = catalog.fonts.find(font => font.id === (id ?? 'inter')) ?? catalog.fonts[0];
  return { ...font, family: `CutkindVideo${font.id}${caption ? 'Caption' : ''}`, file: caption && font.captionFile ? font.captionFile : font.file, weight: caption && font.captionWeight ? font.captionWeight : font.weight, fontStyle: caption && font.captionFile ? 'normal' : font.fontStyle ?? 'normal' };
};
const pending = new Map<string, Promise<void>>();
export function loadEditorFont(id?: string, origin = '', caption = false): Promise<void> {
  const font = editorFont(id, caption), url = `${origin}/api/editor-font/${font.id}${caption ? '?role=caption' : ''}`;
  const key = `${font.family}:${url}`;
  if (!pending.has(key)) {
    const task = new FontFace(font.family, `url("${url}")`, { weight: String(font.weight), style: font.fontStyle }).load().then(face => { document.fonts.add(face); });
    pending.set(key, task);
    void task.catch(() => pending.delete(key));
  }
  return pending.get(key)!;
}
