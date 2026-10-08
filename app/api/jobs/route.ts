import { listJobs } from "../../_lib/jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await listJobs());
}
