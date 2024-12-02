import WebhookHeader from "@/ui/webhooks/webhook-header";
import { ReactNode, use } from "react";

export default function WebhookLayout({
  params,
  children,
}: {
  params: Promise<{ webhookId: string }>;
  children: ReactNode;
}) {
  const { webhookId } = use(params);

  return (
    <div className="max-w-screen grid gap-4">
      <WebhookHeader webhookId={webhookId} />
      {children}
    </div>
  );
}
