import { CLOUD } from "./supabase/config";
import { supabaseServer } from "./supabase/server";
import { sameOrigin } from "./request-security";
import { readProfile } from "./profile";
import { profileFailure } from "./profileState";

export async function billingUser(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  if (!CLOUD) return Response.json({ error: "Las cuentas todavía no están disponibles." }, { status: 503 });
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  try {
    if (!(await readProfile())) return Response.json({ error: "Completa tu estilo antes de continuar.", next: "/estilo" }, { status: 409 });
  } catch (error) {
    const failure = profileFailure(error);
    return Response.json(failure, { status: failure.status });
  }
  return user;
}
