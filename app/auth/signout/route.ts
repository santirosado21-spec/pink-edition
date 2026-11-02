import { NextResponse } from "next/server";
import { CLOUD } from "../../_lib/supabase/config";
import { supabaseServer } from "../../_lib/supabase/server";
import { sameOrigin } from "../../_lib/request-security";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  if (CLOUD) await (await supabaseServer()).auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
