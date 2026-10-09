import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

// Cliente con la sesión del usuario: todo pasa por RLS, nunca con la clave de servicio.
export const supabaseServer = async () => {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Desde un componente de servidor las cookies son de sólo lectura; el proxy las renueva.
        }
      },
    },
  });
};
