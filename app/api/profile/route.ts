import { readProfile, saveProfile } from "../../_lib/profile";
import { checkPreferences, type Preferences } from "../../../src/preferences";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ preferences: await readProfile() });
}

export async function PUT(request: Request) {
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
