import type { Metadata } from "next";
import { StyleQuiz } from "../_components/StyleQuiz";
import { readProfile } from "../_lib/profile";
import { CLOUD } from "../_lib/supabase/config";
import { requireAccount } from "../_lib/account";
import { ProfileRecovery } from "../_components/ProfileRecovery";
import { profileFailure } from "../_lib/profileState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu estilo — Cutkind" };

// Cuestionario de estilo: se contesta una vez por cuenta y se puede cambiar después.
export default async function Page() {
  if (CLOUD) await requireAccount();
  try { return <StyleQuiz initial={await readProfile()} cloud={CLOUD} />; }
  catch (error) {
    const failure = profileFailure(error);
    return <ProfileRecovery message={failure.error} invalid={failure.status === 422} cloud={CLOUD} />;
  }
}
