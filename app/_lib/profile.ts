import { promises as fs } from "node:fs";
import path from "node:path";
import { checkPreferences, type Preferences } from "../../src/preferences";
import { CLOUD } from "./supabase/config";
import { supabaseServer } from "./supabase/server";

// El estilo del creador: una fila por cuenta en la nube, un archivo en modo local.
// Mismo aviso al compilador que en jobs.ts: `work/` son datos de esta máquina.
export const profileFile = () => path.join(/* turbopackIgnore: true */ process.cwd(), "work", "_profile.json");

const valid = (value: unknown): Preferences | null => (value && checkPreferences(value).length === 0 ? (value as Preferences) : null);

export const readProfile = async (): Promise<Preferences | null> => {
  if (CLOUD) {
    const { data } = await (await supabaseServer()).from("profiles").select("preferences").maybeSingle();
    return valid(data?.preferences);
  }
  try {
    return valid(JSON.parse(await fs.readFile(profileFile(), "utf-8")));
  } catch {
    return null;
  }
};

// Devuelve el motivo si no se pudo guardar.
export const saveProfile = async (preferences: Preferences): Promise<string | null> => {
  if (CLOUD) {
    const supabase = await supabaseServer();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return "Inicia sesión.";
    const { error } = await supabase.from("profiles").upsert({ user_id: user.id, preferences, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    return error?.message ?? null;
  }
  try {
    await fs.mkdir(path.dirname(profileFile()), { recursive: true });
    await fs.writeFile(profileFile(), JSON.stringify(preferences, null, 2) + "\n", "utf-8");
    return null;
  } catch {
    return "No se pudo guardar el estilo en este equipo.";
  }
};
