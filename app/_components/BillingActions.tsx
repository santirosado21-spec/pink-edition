"use client";

import { useState } from "react";
import type { BillingPlan } from "../_lib/billing";

export function BillingActions({ plans, hasCustomer }: { plans: BillingPlan[]; hasCustomer: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = async (kind: "checkout" | "portal", priceId?: string) => {
    setBusy(priceId ?? "portal");
    setError(null);
    try {
      const response = await fetch(`/api/billing/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priceId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No pudimos abrir el pago.");
      if (!result.url) throw new Error("Este pago ya terminó. Revisa tu cuenta antes de intentarlo de nuevo.");
      window.location.assign(result.url);
    } catch (failure) {
      setError((failure as Error).message);
      setBusy(null);
    }
  };
  return <>
    <div className="billing-plans">{plans.map(plan => <article className="billing-plan" key={plan.id}>
      <h2>{plan.name}</h2><p className="muted">{plan.description}</p>
      <p className="billing-price">{plan.price}<span>{plan.interval ? `cada ${plan.interval}` : "pago único"}</span></p>
      <button type="button" className="button primary" disabled={busy !== null} onClick={() => open("checkout", plan.id)}>{busy === plan.id ? "Abriendo…" : "Continuar al pago"}</button>
    </article>)}</div>
    {hasCustomer && <button type="button" className="button" disabled={busy !== null} onClick={() => open("portal")}>{busy === "portal" ? "Abriendo…" : "Gestionar pagos y suscripción"}</button>}
    {error && <p role="alert" className="notice">{error}</p>}
  </>;
}
