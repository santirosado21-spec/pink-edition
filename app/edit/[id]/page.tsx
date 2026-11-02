import { Editor } from "../../_components/Editor";
import { Waiting } from "../../_components/Waiting";
import { CLOUD, cloudJob, cloudStatus } from "../../_lib/cloud";
import { jobStatus, readJob, validId } from "../../_lib/jobs";
import { requireAccount } from "../../_lib/account";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (CLOUD) await requireAccount();
  const { id } = await params;
  const job = CLOUD ? await cloudJob(id) : validId(id) ? await readJob(id) : null;
  if (!job) {
    const status = CLOUD ? ((await cloudStatus(id))?.status ?? null) : validId(id) ? await jobStatus(id) : null;
    if (!CLOUD && (!status || status.updated_at === 0)) redirect("/app");
    return <Waiting id={id} initial={status} />;
  }
  return <Editor initial={job} />;
}
