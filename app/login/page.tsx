"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "../_lib/supabase/browser";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(new URLSearchParams(window.location.search).has("error")), []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError(null);
    const { error: failure } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: false } });
    if (failure) {
      // Pink.ai abre por invitación: sólo entran los correos dados de alta en Supabase.
      setError(/signups? not allowed/i.test(failure.message) ? "Este correo no tiene acceso todavía. Pink.ai abre por invitación." : failure.message);
      setState("idle");
    } else setState("sent");
  };

  return (
    <div className="waiting">
      <form onSubmit={submit} style={{ maxWidth: 380, width: "100%", padding: 24 }}>
        <Link href="/" className="brand"><img src="/logo.png" alt="" /><b>Pink<span>.ai</span></b></Link>
        <h2>Entrar</h2>
        {state === "sent" ? (
          <p className="muted">Te enviamos un enlace a <b>{email}</b>. Ábrelo en este mismo navegador.</p>
        ) : (
          <>
            <p className="muted">Escribe tu correo y te enviamos un enlace para entrar, sin contraseña.</p>
            <input type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", marginBottom: 12 }} />
            <button className="button primary" disabled={state === "sending"} style={{ width: "100%" }}>{state === "sending" ? "Enviando…" : "Enviarme el enlace"}</button>
          </>
        )}
        {(error || failed) && <div className="notice">{error ?? "El enlace no funcionó o ya venció. Pide uno nuevo."}</div>}
      </form>
    </div>
  );
}
