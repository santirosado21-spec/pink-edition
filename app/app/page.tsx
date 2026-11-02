import { Home } from "../_components/Home";
import { CLOUD, cloudList } from "../_lib/cloud";
import { ENGINE_HERE, listJobs } from "../_lib/jobs";
import { readProfileFile } from "../_lib/profileFile";
import { LocalIntake } from "../_components/LocalIntake";
import { ProfileRecovery } from "../_components/ProfileRecovery";
import { profileFailure } from "../_lib/profileState";
import { requireOnboarding } from "../_lib/account";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (CLOUD) await requireOnboarding();
  // Cada grabación comienza con preguntas, incluso si ya existe un perfil.
  if (!CLOUD && ENGINE_HERE) {
    try { return <LocalIntake initial={await readProfileFile()} />; }
    catch (error) {
      const failure = profileFailure(error);
      return <ProfileRecovery message={failure.error} invalid={failure.status === 422} />;
    }
  }
  return <Home initial={CLOUD ? await cloudList() : await listJobs()} online={CLOUD ? process.env.CLOUD_ENGINE_ENABLED !== "true" : !ENGINE_HERE} cloud={CLOUD} />;
}
