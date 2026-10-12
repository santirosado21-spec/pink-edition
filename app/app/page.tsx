import { redirect } from "next/navigation";
import { Home } from "../_components/Home";
import { CLOUD, cloudList } from "../_lib/cloud";
import { ENGINE_HERE, listJobs } from "../_lib/jobs";
import { readProfile } from "../_lib/profile";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Antes del primer video, el creador contesta el cuestionario de estilo (una vez por cuenta).
  if ((CLOUD || ENGINE_HERE) && !(await readProfile())) redirect("/estilo");
  return <Home initial={CLOUD ? await cloudList() : await listJobs()} online={!CLOUD && !ENGINE_HERE} cloud={CLOUD} />;
}
