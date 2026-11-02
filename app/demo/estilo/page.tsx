import { notFound } from "next/navigation";
import { StyleQuiz } from "../../_components/StyleQuiz";
import { DEMO_ENABLED } from "../../_lib/supabase/config";

export const metadata = { title: "Prueba tu estilo — Cutkind" };
export default function DemoStyle() {
  if (!DEMO_ENABLED) notFound();
  return <StyleQuiz initial={null} demo />;
}
