import WebhookEventsPageClient from "./page-client";

export default async function WebhookEventsPage({
  params,
}: {
  params: { webhookId: string };
}) {
  const { webhookId } = params;

  return <WebhookEventsPageClient webhookId={webhookId} />;
}
