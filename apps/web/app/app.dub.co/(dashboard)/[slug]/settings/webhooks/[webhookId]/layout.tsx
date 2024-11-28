import WebhookHeader from "@/ui/webhooks/webhook-header";
import { ReactNode } from "react";

export default async function WebhookLayout({
  params,
  children,
}: {
  params: Promise<{ webhookId: string }>;
  children: ReactNode;
}) {
  const { webhookId } = await params;

  return (
    <div className="max-w-screen grid gap-4">
      <WebhookHeader webhookId={webhookId} />
      {children}
    </div>
  );
}
