import { readProfile, saveProfile } from "../../_lib/profile";
import { checkPreferences, type Preferences } from "../../../src/preferences";
import { CLOUD } from "../../_lib/supabase/config";
import { supabaseServer } from "../../_lib/supabase/server";
import { sameOrigin } from "../../_lib/request-security";
import { profileFailure } from "../../_lib/profileState";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return Response.json({ preferences: await readProfile() }); }
  catch (error) {
    const failure = profileFailure(error);
    return Response.json(failure, { status: failure.status });
  }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  if (CLOUD && !(await (await supabaseServer()).auth.getUser()).data.user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  let preferences: unknown;
  try {
    preferences = await request.json();
  } catch {
    return Response.json({ error: "El estilo no llegó como JSON válido." }, { status: 400 });
  }
  const errors = checkPreferences(preferences);
  if (errors.length > 0) return Response.json({ error: errors.join(" ") }, { status: 400 });
  const failure = await saveProfile(preferences as Preferences);
  return failure ? Response.json({ error: failure }, { status: 500 }) : Response.json({ preferences });
}
