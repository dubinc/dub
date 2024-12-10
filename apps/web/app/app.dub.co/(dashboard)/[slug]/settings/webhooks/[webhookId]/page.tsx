import WebhookEventsPageClient from "./page-client";

export default async function WebhookEventsPage({
  params,
}: {
  params: Promise<{ webhookId: string }>;
}) {
  const { webhookId } = await params;

  return <WebhookEventsPageClient webhookId={webhookId} />;
}
