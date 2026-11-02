import type Stripe from "stripe";
import { stripeClient, syncCheckout } from "../../../_lib/billing";
import { supabaseAdmin } from "../../../_lib/supabase/admin";
import { objectId } from "../../../_lib/billing-policy";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return Response.json({ error: "Webhook not configured" }, { status: 503 });
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try { event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return Response.json({ error: "Invalid signature" }, { status: 400 }); }

  const checkoutEvents = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"];
  const accountEvents = ["invoice.paid", "invoice.payment_failed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"];
  if (![...checkoutEvents, ...accountEvents].includes(event.type)) return Response.json({ received: true });
  try {
    const db = supabaseAdmin();
    const previous = await db.from("billing_events").select("event_id").eq("event_id", event.id).maybeSingle();
    if (previous.error) throw new Error("Event lookup failed");
    if (previous.data) return Response.json({ received: true });
    const object = event.data.object as Stripe.Checkout.Session | Stripe.Invoice | Stripe.Subscription;
    if (checkoutEvents.includes(event.type)) await syncCheckout(object.id);
    const customerId = objectId(object.customer);
    // Registro técnico sin datos de tarjeta, correos ni el payload completo.
    const saved = await db.from("billing_events").upsert({ event_id: event.id, event_type: event.type, object_id: object.id, stripe_customer_id: customerId, stripe_created_at: new Date(event.created * 1000).toISOString() }, { onConflict: "event_id", ignoreDuplicates: true });
    if (saved.error) throw new Error("Event write failed");
    return Response.json({ received: true });
  } catch {
    // Un 5xx hace que Stripe reintente; nunca se confirma un evento que no se pudo persistir.
    return Response.json({ error: "Could not process event" }, { status: 500 });
  }
}
