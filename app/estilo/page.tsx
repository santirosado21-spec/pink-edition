import type { Metadata } from "next";
import { StyleQuiz } from "../_components/StyleQuiz";
import { readProfile } from "../_lib/profile";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu estilo — Pink.ai" };

// Cuestionario de estilo: se contesta una vez por cuenta y se puede cambiar después.
export default async function Page() {
  return <StyleQuiz initial={await readProfile()} />;
}
