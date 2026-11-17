// Firma del fallo transitorio del compositor Remotion observado en arranques
// fríos: la ruta de medios responde 200 y la fuente está íntegra, pero la
// extracción de fotogramas falla; el reintento inmediato lo supera.
export const isTransientCompositorError = (message) =>
  typeof message === 'string' && message.includes('No frame found at position');
