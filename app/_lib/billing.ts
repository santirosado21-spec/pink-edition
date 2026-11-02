import "server-only";
import Stripe from "stripe";
import type { User } from "@supabase/supabase-js";
import { CLOUD } from "./supabase/config";
import { supabaseAdmin } from "./supabase/admin";
import { allowedPriceIds, billingOrigin, objectId } from "./billing-policy";

export const stripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 15000 });
};

export function billingReady() {
  try { billingOrigin(); } catch { return false; }
  return Boolean(CLOUD && process.env.BILLING_ENABLED === "true" && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) && allowedPriceIds().length);
}

export type BillingPlan = { id: string; name: string; description: string; price: string; interval: string | null };
export async function billingPlans(): Promise<BillingPlan[]> {
  if (!billingReady()) return [];
  const stripe = stripeClient();
  const prices = await Promise.all(allowedPriceIds().map(id => stripe.prices.retrieve(id, { expand: ["product"] })));
  return prices.flatMap(price => {
    const product = price.product as Stripe.Product;
    if (!price.active || product.deleted || !product.active || price.unit_amount === null || price.billing_scheme !== "per_unit" || price.recurring?.usage_type === "metered") return [];
    const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: price.currency });
    const divisor = 10 ** (currency.resolvedOptions().maximumFractionDigits ?? 2);
    const units: Record<string, string> = { day: "día", week: "semana", month: "mes", year: "año" };
    if (price.recurring && !(price.recurring.interval in units)) return [];
    const interval = price.recurring ? `${price.recurring.interval_count} ${units[price.recurring.interval]}${price.recurring.interval_count > 1 ? (price.recurring.interval === "month" ? "es" : "s") : ""}` : null;
    return [{ id: price.id, name: product.name, description: product.description ?? "", price: `${currency.format(price.unit_amount / divisor)} ${price.currency.toUpperCase()}`, interval }];
  });
}

export async function findCustomer(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().from("billing_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Could not load billing customer");
  return data?.stripe_customer_id ?? null;
}

export async function ensureCustomer(user: User): Promise<string> {
  const existing = await findCustomer(user.id);
  if (existing) return existing;
  const customer = await stripeClient().customers.create({ metadata: { cutkind_user_id: user.id } }, { idempotencyKey: `cutkind-customer-${user.id}` });
  const { error } = await supabaseAdmin().from("billing_customers").upsert({ user_id: user.id, stripe_customer_id: customer.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw new Error("Could not save billing customer");
  return (await findCustomer(user.id))!;
}

// Sólo se sincronizan sesiones que pertenecen a un cliente creado por nuestro servidor.
// Se consulta el estado actual, no un snapshot antiguo que podría llegar fuera de orden.
export async function syncCheckout(sessionId: string, expectedUserId?: string) {
  const session = await stripeClient().checkout.sessions.retrieve(sessionId);
  const customerId = objectId(session.customer);
  if (!customerId) return null;
  const db = supabaseAdmin();
  const { data: customer, error } = await db.from("billing_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  if (error) throw new Error("Could not load billing owner");
  if (!customer || (expectedUserId && customer.user_id !== expectedUserId) || session.client_reference_id !== customer.user_id) return null;
  const saved = await db.from("billing_checkouts").upsert({
    session_id: session.id, user_id: customer.user_id, stripe_customer_id: customerId,
    status: session.status, payment_status: session.payment_status,
    amount_total: session.amount_total, currency: session.currency,
    subscription_id: objectId(session.subscription), payment_intent_id: objectId(session.payment_intent),
    created_at: new Date(session.created * 1000).toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: "session_id" });
  if (saved.error) throw new Error("Could not persist checkout");
  return session;
}
