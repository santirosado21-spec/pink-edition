import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { checkPreferences, type Preferences } from "../../src/preferences";
import { CLOUD } from "./supabase/config";
import { supabaseServer } from "./supabase/server";
import { profileFile, readProfileFile } from "./profileFile";
import { invalidSession, profileFailure, storedPreferences } from "./profileState";

// El estilo del creador: una fila por cuenta en la nube, un archivo en modo local.
// Mismo aviso al compilador que en jobs.ts: `work/` son datos de esta máquina.
export { profileFile };

export const readProfile = async (): Promise<Preferences | null> => {
  if (CLOUD) {
    const supabase = await supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && !invalidSession(authError)) throw new Error("No se pudo comprobar tu sesión.");
    if (authError || !user) return null;
    const { data, error } = await supabase.from("profiles").select("preferences").eq("user_id", user.id).maybeSingle();
    if (error) throw new Error("No se pudo cargar tu estilo. Inténtalo de nuevo.");
    return data === null ? null : storedPreferences(data.preferences);
  }
  return readProfileFile();
};

export async function profileDestination() {
  try { return (await readProfile()) ? "/app" : "/estilo"; }
  catch (error) { return profileFailure(error).next; }
}

// Devuelve el motivo si no se pudo guardar.
export const saveProfile = async (preferences: Preferences): Promise<string | null> => {
  const problems = checkPreferences(preferences);
  if (problems.length) return problems.join(" ");
  if (CLOUD) {
    const supabase = await supabaseServer();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return "Inicia sesión.";
    const { error } = await supabase.from("profiles").upsert({ user_id: user.id, preferences, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    return error ? "No se pudo guardar tu estilo. Inténtalo de nuevo." : null;
  }
  const file = profileFile();
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(temporary, JSON.stringify(preferences, null, 2) + "\n", { encoding: "utf-8", flag: "wx" });
    await fs.rename(temporary, file);
    return null;
  } catch {
    return "No se pudo guardar el estilo en este equipo.";
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
  }
};
