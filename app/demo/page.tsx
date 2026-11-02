import { notFound } from "next/navigation";
import { Home } from "../_components/Home";
import { DEMO_ENABLED } from "../_lib/supabase/config";

export const metadata = { title: "Demo — Cutkind" };
export default function Demo() {
  if (!DEMO_ENABLED) notFound();
  return <Home initial={[]} online demo />;
}
