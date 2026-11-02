// Modo nube: se activa sólo si están definidas las dos variables públicas.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const CLOUD = SUPABASE_URL !== "" && SUPABASE_KEY !== "";
// Se abre el acceso público cuando el correo transaccional está configurado y probado.
export const AUTH_EMAIL_READY = CLOUD && process.env.NEXT_PUBLIC_AUTH_EMAIL_READY === "true";
// Límite de archivo del plan gratuito de Supabase Storage; más grande exige subida reanudable.
export const CLOUD_MAX_MB = 50;

// Acceso temporal a la demo; no concede acceso a datos ni APIs de cuentas.
export const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_ENABLED !== "false";
