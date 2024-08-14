import WebhookLogsPageClient from "./page-client";

export default async function WebhookLogsPage({
  params,
}: {
  params: { webhookId: string };
}) {
  const { webhookId } = params;

  return <WebhookLogsPageClient webhookId={webhookId} />;
}
