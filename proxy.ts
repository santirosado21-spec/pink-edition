import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

// En modo nube renueva la sesión y manda a /login a quien no la tenga.
export async function proxy(request: NextRequest) {
  if (!url || !key) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!data.user && path.startsWith("/api/")) return Response.json({ error: "Inicia sesión." }, { status: 401 });
  if (!data.user && path !== "/login") return NextResponse.redirect(new URL("/login", request.url));
  if (data.user && path === "/login") return NextResponse.redirect(new URL("/app", request.url));
  return response;
}

export const config = { matcher: ["/app/:path*", "/edit/:path*", "/api/jobs/:path*", "/login"] };
