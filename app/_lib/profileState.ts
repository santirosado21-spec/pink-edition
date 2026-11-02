import { checkPreferences, type Preferences } from "../../src/preferences";

export class ProfileError extends Error {
  readonly code = "invalid_profile";
  constructor(problems: string[]) {
    super(`Tu estilo guardado necesita revisión. ${problems.slice(0, 3).join(" ")}`);
  }
}

export class ProfileReadError extends Error {
  constructor() { super("No se pudo cargar tu estilo. Inténtalo de nuevo."); }
}

// Sólo el adaptador de almacenamiento puede decidir que no existe un perfil.
export function storedPreferences(value: unknown): Preferences {
  const errors = checkPreferences(value);
  if (errors.length) throw new ProfileError(errors);
  return value as Preferences;
}

export function profileFailure(error: unknown) {
  return error instanceof ProfileError
    ? { error: error.message, code: error.code, status: 422, next: "/estilo?perfil=invalido" }
    : { error: "No se pudo cargar tu estilo. Inténtalo de nuevo.", code: "profile_unavailable", status: 503, next: "/estilo?perfil=lectura" };
}

// Un token rechazado pide iniciar sesión; 429, timeout y 5xx piden reintento.
export const invalidSession = (error: { name?: string; status?: number } | null) =>
  ["AuthSessionMissingError", "AuthInvalidCredentialsError", "AuthInvalidJwtError"].includes(error?.name ?? "") ||
  (error?.name === "AuthApiError" && error.status !== undefined && error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status));
