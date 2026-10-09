import { NextResponse } from "next/server";
import { supabaseServer } from "../../_lib/supabase/server";

// El enlace del correo llega aquí con un código que se cambia por la sesión.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await (await supabaseServer()).auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?error=1", url.origin));
  }
  return NextResponse.redirect(new URL("/app", url.origin));
}
