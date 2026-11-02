"use client";

import { Brand } from "../_components/Brand";
import { ThemePicker } from "../_components/ThemePicker";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "../_lib/supabase/browser";
import Link from "next/link";
import { AUTH_EMAIL_READY, DEMO_ENABLED } from "../_lib/supabase/config";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(new URLSearchParams(window.location.search).has("error")), []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!AUTH_EMAIL_READY) return;
    setState("sending");
    setError(null);
    try {
    const { error: failure } = await supabaseBrowser().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: true } });
    if (failure) {
      setError("No pudimos enviar el enlace. Revisa el correo e inténtalo de nuevo en unos minutos.");
      setState("idle");
    } else setState("sent");
    } catch {
      setError("No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.");
      setState("idle");
    }
  };

  return (
    <div className="waiting login-page">
      <form onSubmit={submit} style={{ maxWidth: 380, width: "100%", padding: 24 }}>
        <div className="login-brand"><Brand /><ThemePicker /></div>
        {DEMO_ENABLED && <div style={{ marginBlock: 24 }}><Link href="/demo" className="button primary" style={{ width: "100%" }}>Entrar a la demo sin cuenta</Link><p className="muted">Explora Cutkind y prueba tu estilo sin registrarte.</p></div>}
        <h2>Crea tu cuenta o entra</h2>
        {state === "sent" ? (
          <p className="muted">Te enviamos un enlace a <b>{email}</b>. Ábrelo en este mismo navegador.</p>
        ) : (
          <>
            <p className="muted">Usa tu correo para entrar sin contraseña. Si eres nuevo, crearemos tu cuenta al verificarlo y empezarás definiendo tu estilo.</p>
            <input type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Correo electrónico" placeholder="tu@correo.com" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", marginBottom: 12 }} />
            <button className="button primary" disabled={!AUTH_EMAIL_READY || state === "sending"} style={{ width: "100%" }}>{state === "sending" ? "Enviando…" : "Continuar con mi correo"}</button>
            {!AUTH_EMAIL_READY && <p className="notice">El acceso por correo estará disponible pronto. Estamos preparando las cuentas de Cutkind.</p>}
          </>
        )}
        {(error || failed) && <div className="notice">{error ?? "El enlace no funcionó o ya venció. Pide uno nuevo."}</div>}
      </form>
    </div>
  );
}
