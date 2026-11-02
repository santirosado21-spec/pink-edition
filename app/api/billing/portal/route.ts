import { billingReady, findCustomer, stripeClient } from "../../../_lib/billing";
import { billingUser } from "../../../_lib/billing-request";
import { billingOrigin } from "../../../_lib/billing-policy";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await billingUser(request);
    if (user instanceof Response) return user;
    if (!billingReady()) return Response.json({ error: "Los pagos estarán disponibles pronto." }, { status: 503 });
    const customer = await findCustomer(user.id);
    if (!customer) return Response.json({ error: "Todavía no tienes pagos que gestionar." }, { status: 404 });
    const session = await stripeClient().billingPortal.sessions.create({ customer, return_url: `${billingOrigin()}/cuenta` });
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "No pudimos abrir tus pagos. Inténtalo de nuevo." }, { status: 503 });
  }
}
