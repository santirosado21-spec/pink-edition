/** Local API sessions and archived local review folders use the same renderer. */
export const editorMedia = (base: string, asset: string) => base.endsWith('/')
  ? `${base}${encodeURIComponent(asset)}`
  : `${base}&asset=${encodeURIComponent(asset)}`;
