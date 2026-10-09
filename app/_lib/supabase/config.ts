// Modo nube: se activa sólo si están definidas las dos variables públicas.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const CLOUD = SUPABASE_URL !== "" && SUPABASE_KEY !== "";
// Límite de archivo del plan gratuito de Supabase Storage; más grande exige subida reanudable.
export const CLOUD_MAX_MB = 50;
