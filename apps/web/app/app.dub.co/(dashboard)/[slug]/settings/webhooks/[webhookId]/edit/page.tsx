import UpdateWebhookPageClient from "./page-client";

export default async function UpdateWebhookPage(
  props: {
    params: Promise<{ webhookId: string }>;
  }
) {
  const params = await props.params;
  const { webhookId } = params;

  return <UpdateWebhookPageClient webhookId={webhookId} />;
}
