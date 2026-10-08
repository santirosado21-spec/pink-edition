import { Home } from "../_components/Home";
import { listJobs } from "../_lib/jobs";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <Home initial={await listJobs()} />;
}
