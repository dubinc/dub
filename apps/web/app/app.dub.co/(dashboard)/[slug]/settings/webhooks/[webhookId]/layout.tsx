import WebhookHeader from "@/ui/webhooks/webhook-header";
import { ReactNode } from "react";

export default async function WebhookLayout(
  props: {
    params: Promise<{ webhookId: string }>;
    children: ReactNode;
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

  return (
    <div className="max-w-screen grid gap-4">
      <WebhookHeader webhookId={params.webhookId} />
      {children}
    </div>
  );
}
