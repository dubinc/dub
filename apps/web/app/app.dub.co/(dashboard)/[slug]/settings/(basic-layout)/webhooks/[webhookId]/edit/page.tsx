import UpdateWebhookPageClient from "./page-client";

export default async function UpdateWebhookPage({
  params,
}: {
  params: { webhookId: string };
}) {
  const { webhookId } = params;

  return <UpdateWebhookPageClient webhookId={webhookId} />;
}
