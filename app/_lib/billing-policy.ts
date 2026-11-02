export function allowedPriceIds(value = process.env.STRIPE_PRICE_IDS ?? ""): string[] {
  return [...new Set(value.split(",").map(id => id.trim()).filter(id => /^price_[a-zA-Z0-9]+$/.test(id)))];
}

export function billingOrigin(value = process.env.APP_URL ?? ""): string {
  const url = new URL(value);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Invalid APP_URL");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("APP_URL must use HTTPS");
  return url.origin;
}

export function isPaidCheckout(session: { status: string | null; payment_status: string }): boolean {
  return session.status === "complete" && ["paid", "no_payment_required"].includes(session.payment_status);
}

export const objectId = (value: string | { id: string } | null): string | null => typeof value === "string" ? value : value?.id ?? null;
