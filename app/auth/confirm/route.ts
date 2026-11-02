import { NextResponse } from "next/server";
import { CLOUD } from "../../_lib/supabase/config";
import { supabaseServer } from "../../_lib/supabase/server";
import { profileDestination } from "../../_lib/profile";

// Enlaces de correo válidos incluso si se abren en otro dispositivo.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (!CLOUD || !hash || !["email", "magiclink", "signup"].includes(type ?? "")) return NextResponse.redirect(new URL("/login?error=1", url.origin));
  const { error } = await (await supabaseServer()).auth.verifyOtp({ token_hash: hash, type: type as "email" | "magiclink" | "signup" });
  if (error) return NextResponse.redirect(new URL("/login?error=1", url.origin));
  return NextResponse.redirect(new URL(await profileDestination(), url.origin));
}
