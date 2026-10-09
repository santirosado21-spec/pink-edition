import { CLOUD, cloudList } from "../../_lib/cloud";
import { listJobs } from "../../_lib/jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(CLOUD ? await cloudList() : await listJobs());
}
