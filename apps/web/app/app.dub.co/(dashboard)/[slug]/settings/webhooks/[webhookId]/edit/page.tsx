import UpdateWebhookPageClient from "./page-client";

export default async function UpdateWebhookPage({
  params,
}: {
  params: Promise<{ webhookId: string }>;
}) {
  const { webhookId } = await params;

  return <UpdateWebhookPageClient webhookId={webhookId} />;
}
