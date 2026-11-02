import Link from "next/link";
import { Brand } from "../_components/Brand";
import { ThemePicker } from "../_components/ThemePicker";
import { BillingActions } from "../_components/BillingActions";
import { requireOnboarding } from "../_lib/account";
import { billingReady, billingPlans, findCustomer, stripeClient, syncCheckout } from "../_lib/billing";
import { isPaidCheckout } from "../_lib/billing-policy";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi cuenta — Cutkind" };

export default async function Account({ searchParams }: { searchParams: Promise<{ checkout?: string; cancelled?: string }> }) {
  const user = await requireOnboarding();
  const params = await searchParams;
  let notice = params.cancelled === "1" ? "Has vuelto sin completar este pago." : null;
  let plans: Awaited<ReturnType<typeof billingPlans>> = [];
  let customer: string | null = null;
  let subscriptions: { id: string; status: string; cancel_at_period_end: boolean }[] = [];
  let invoices: { id: string; number: string | null; hosted_invoice_url?: string | null }[] = [];
  if (billingReady()) {
    try {
      plans = await billingPlans();
      customer = await findCustomer(user.id);
      if (params.checkout && /^cs_(?:test_|live_)?[a-zA-Z0-9]+$/.test(params.checkout)) {
        const session = await syncCheckout(params.checkout, user.id);
        notice = !session ? "No encontramos ese pago en tu cuenta." : isPaidCheckout(session) ? "Tu pago está confirmado. Gracias por elegir Cutkind." : "El pago todavía no está confirmado. Puedes volver a revisar esta página.";
      }
      if (customer) {
        const stripe = stripeClient();
        subscriptions = (await stripe.subscriptions.list({ customer, status: "all", limit: 10 })).data;
        invoices = (await stripe.invoices.list({ customer, limit: 5 })).data;
      }
    } catch {
      plans = [];
      notice = "No pudimos cargar tus pagos. Inténtalo de nuevo en unos minutos.";
    }
  }
  const statuses: Record<string, string> = { active: "Activa", trialing: "En prueba", canceled: "Cancelada", past_due: "Pago pendiente", unpaid: "Sin pagar", incomplete: "Pendiente de completar", incomplete_expired: "Vencida", paused: "Pausada" };
  return <main className="home account-page">
    <header><Brand /><Link className="button ghost" href="/app">Mi estudio</Link><ThemePicker /></header>
    <section className="account-intro"><span className="studio-eyebrow">TU CUENTA</span><h1>Todo en su sitio.</h1><p className="muted">{user.email}</p><Link className="button" href="/estilo">Editar mi estilo</Link></section>
    {notice && <p role="status" className="notice">{notice}</p>}
    <section><h2>Planes y pagos</h2><p className="muted">Revisa el importe y la frecuencia antes de confirmar. Stripe gestiona el pago de forma segura.</p>
      {!billingReady() && <p className="notice">Los planes de pago estarán disponibles pronto. Tu cuenta y tu estilo ya están guardados.</p>}
      <BillingActions plans={plans} hasCustomer={Boolean(customer) && billingReady()} />
      {subscriptions.length > 0 && <div className="account-records"><h3>Suscripciones</h3>{subscriptions.map(subscription => <p key={subscription.id}>{statuses[subscription.status] ?? "En revisión"}{subscription.cancel_at_period_end ? " · Se cancela al terminar el periodo actual" : ""}</p>)}</div>}
      {invoices.length > 0 && <div className="account-records"><h3>Facturas recientes</h3>{invoices.map(invoice => invoice.hosted_invoice_url && <p key={invoice.id}><a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer">Ver factura {invoice.number}</a></p>)}</div>}
    </section>
    <form action="/auth/signout" method="post" className="account-signout"><button className="button" type="submit">Cerrar sesión</button></form>
  </main>;
}
