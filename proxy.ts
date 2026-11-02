import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_ENABLED } from "./app/_lib/supabase/config";
import { invalidSession, profileFailure, storedPreferences } from "./app/_lib/profileState";

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
  const { data, error: authError } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const finish = (next: NextResponse) => {
    response.cookies.getAll().forEach(cookie => next.cookies.set(cookie));
    next.headers.set("Cache-Control", "private, no-store");
    return next;
  };
  if (authError && !invalidSession(authError)) {
    if (path === "/login") return finish(response);
    return finish(path.startsWith("/api/")
      ? NextResponse.json({ error: "No se pudo comprobar tu sesión. Inténtalo de nuevo." }, { status: 503 })
      : new NextResponse('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Reintentar — Cutkind</title><main><h1>No pudimos comprobar tu sesión</h1><p>Inténtalo de nuevo en un momento. Tus videos siguen guardados.</p><a href="">Volver a intentar</a></main></html>', { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }));
  }
  const user = authError ? null : data.user;
  if (!user && path.startsWith("/api/")) return finish(NextResponse.json({ error: "Inicia sesión." }, { status: 401 }));
  if (!user && DEMO_ENABLED && (path === "/app" || path === "/estilo")) return finish(NextResponse.redirect(new URL(path === "/estilo" ? "/demo/estilo" : "/demo", request.url)));
  if (!user && path !== "/login") return finish(NextResponse.redirect(new URL("/login", request.url)));
  // Un video existente se autoriza por propietario y usa su propio snapshot.
  const existingVideo = /^\/edit\/[^/]+\/?$/.test(path) || /^\/api\/jobs\/[^/]+(?:\/.*)?$/.test(path);
  if (user && path !== "/estilo" && path !== "/api/profile" && !existingVideo) {
    const { data: profile, error } = await supabase.from("profiles").select("preferences").eq("user_id", user.id).maybeSingle();
    let completed = false;
    try {
      if (error) throw error;
      if (profile !== null) { storedPreferences(profile.preferences); completed = true; }
    } catch (problem) {
      const failure = profileFailure(problem);
      return finish(path.startsWith("/api/")
        ? NextResponse.json(failure, { status: failure.status })
        : NextResponse.redirect(new URL(failure.next, request.url)));
    }
    if (!completed && path.startsWith("/api/")) return finish(NextResponse.json({ error: "Completa tu estilo antes de continuar.", next: "/estilo" }, { status: 409 }));
    if (!completed) return finish(NextResponse.redirect(new URL("/estilo", request.url)));
    if (path === "/login") return finish(NextResponse.redirect(new URL("/app", request.url)));
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

// La subida de video queda fuera: con un proxy, Next copia sólo los primeros 10 MB del cuerpo
// de la petición y el resto se perdería en silencio.
export const config = { matcher: ["/app/:path*", "/edit/:path*", "/cuenta", "/estilo", "/api/profile", "/api/jobs", "/api/jobs/((?!upload$).*)", "/login"] };
