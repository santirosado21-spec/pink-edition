import { billingReady, billingPlans, ensureCustomer, stripeClient } from "../../../_lib/billing";
import { billingUser } from "../../../_lib/billing-request";
import { billingOrigin } from "../../../_lib/billing-policy";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await billingUser(request);
    if (user instanceof Response) return user;
    if (!billingReady()) return Response.json({ error: "Los pagos estarán disponibles pronto." }, { status: 503 });
    const body = await request.json().catch(() => null);
    const plan = (await billingPlans()).find(plan => plan.id === body?.priceId);
    if (!plan) return Response.json({ error: "Elige un plan disponible." }, { status: 400 });
    const customer = await ensureCustomer(user);
    const stripe = stripeClient();
    if (plan.interval) {
      const subscriptions = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
      if (subscriptions.data.some(subscription => !["canceled", "incomplete_expired"].includes(subscription.status))) return Response.json({ error: "Ya tienes una suscripción. Puedes cambiarla desde Gestionar pagos." }, { status: 409 });
    }
    const origin = billingOrigin();
    const session = await stripe.checkout.sessions.create({
      customer, client_reference_id: user.id, mode: plan.interval ? "subscription" : "payment",
      line_items: [{ price: plan.id, quantity: 1 }],
      success_url: `${origin}/cuenta?checkout={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cuenta?cancelled=1`,
      ...(plan.interval ? { subscription_data: { metadata: { cutkind_user_id: user.id } } } : {}),
      metadata: { cutkind_user_id: user.id },
    }, { idempotencyKey: `cutkind-checkout-${user.id}-${Math.floor(Date.now() / 1800000)}` });
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "No pudimos abrir el pago. Inténtalo de nuevo en unos minutos." }, { status: 503 });
  }
}
