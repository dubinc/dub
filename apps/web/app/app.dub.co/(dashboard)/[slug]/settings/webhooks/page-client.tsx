"use client";

import useWebhooks from "@/lib/swr/use-webhooks";
import useWorkspace from "@/lib/swr/use-workspace";
import EmptyState from "@/ui/shared/empty-state";
import WebhookCard from "@/ui/webhooks/webhook-card";
import WebhookPlaceholder from "@/ui/webhooks/webhook-placeholder";
import { Webhook } from "lucide-react";

export default function WebhooksPageClient() {
  const { slug, plan } = useWorkspace();

  const { webhooks, isLoading } = useWebhooks();

  const needsHigherPlan = plan === "free" || plan === "pro";

  if (needsHigherPlan) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white p-10">
        <EmptyState
          icon={Webhook}
          title="Webhooks"
          description="Webhooks allow you to receive HTTP requests whenever a specific event (eg: someone clicked your link) occurs in Dub."
          learnMore="https://d.to/webhooks"
          buttonText="Upgrade to Business"
          buttonLink={`/${slug}/upgrade`}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="animate-fade-in">
        {!isLoading ? (
          webhooks && webhooks.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {webhooks.map((webhook) => (
                <WebhookCard {...webhook} key={webhook.id} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-neutral-200 py-10">
              <EmptyState
                icon={Webhook}
                title="You haven't set up any webhooks yet."
                description="Webhooks allow you to receive HTTP requests whenever a specific event (eg: someone clicked your link) occurs in Dub."
                learnMore="https://d.to/webhooks"
              />
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <WebhookPlaceholder key={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
