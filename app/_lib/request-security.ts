// Sólo se aceptan mutaciones desde nuestra propia interfaz. No se confía en Host para redirigir pagos.
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}
