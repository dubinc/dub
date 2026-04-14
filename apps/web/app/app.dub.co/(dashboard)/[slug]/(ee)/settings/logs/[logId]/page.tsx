import { LogDetailPageClient } from "./page-client";

export default async function LogDetailPage(props: {
  params: Promise<{ logId: string }>;
}) {
  const params = await props.params;

  return <LogDetailPageClient logId={params.logId} />;
}
