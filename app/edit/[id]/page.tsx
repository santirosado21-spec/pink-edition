import { Editor } from "../../_components/Editor";
import { Waiting } from "../../_components/Waiting";
import { jobStatus, readJob, validId } from "../../_lib/jobs";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = validId(id) ? await readJob(id) : null;
  if (!job) return <Waiting id={id} initial={validId(id) ? await jobStatus(id) : null} />;
  return <Editor initial={job} />;
}
