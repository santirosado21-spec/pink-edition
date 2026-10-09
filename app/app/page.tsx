import { Home } from "../_components/Home";
import { CLOUD, cloudList } from "../_lib/cloud";
import { ENGINE_HERE, listJobs } from "../_lib/jobs";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <Home initial={CLOUD ? await cloudList() : await listJobs()} online={!CLOUD && !ENGINE_HERE} cloud={CLOUD} />;
}
