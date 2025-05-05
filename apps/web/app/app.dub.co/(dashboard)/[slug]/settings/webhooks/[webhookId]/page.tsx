import WebhookEventsPageClient from "./page-client";

export default async function WebhookEventsPage(
  props: {
    params: Promise<{ webhookId: string }>;
  }
) {
  const params = await props.params;
  const { webhookId } = params;

  return <WebhookEventsPageClient webhookId={webhookId} />;
}
