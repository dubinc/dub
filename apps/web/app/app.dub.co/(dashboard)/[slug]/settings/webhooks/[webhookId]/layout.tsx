import WebhookHeader from "@/ui/webhooks/webhook-header";
import { ReactNode } from "react";

export default function WebhookLayout({
  params,
  children,
}: {
  params: { webhookId: string };
  children: ReactNode;
}) {
  return (
    <div className="max-w-screen grid gap-4">
      <WebhookHeader webhookId={params.webhookId} />
      {children}
    </div>
  );
}
