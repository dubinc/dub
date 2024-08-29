"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps } from "@/lib/types";
import EmptyState from "@/ui/shared/empty-state";
import WebhookCard from "@/ui/webhooks/webhook-card";
import WebhookPlaceholder from "@/ui/webhooks/webhook-placeholder";
import { Button, TooltipContent, useRouterStuff } from "@dub/ui";
import { InfoTooltip } from "@dub/ui/src/tooltip";
import { fetcher } from "@dub/utils";
import { Webhook } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import useSWR from "swr";

export default function WebhooksPageClient() {
  const router = useRouter();
  const workspace = useWorkspace();
  const { queryParams } = useRouterStuff();

  if (!workspace.flags?.webhooks) {
    redirect(`/${workspace.slug}/settings`);
  }

  const { data: webhooks, isLoading } = useSWR<WebhookProps[]>(
    `/api/webhooks?workspaceId=${workspace.id}`,
    fetcher,
  );

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.write",
    role: workspace.role,
  });

  const needsHigherPlan = workspace.plan === "free" || workspace.plan === "pro";

  if (needsHigherPlan) {
    return (
      <div className="rounded-md border border-gray-200 bg-white p-10">
        <EmptyState
          icon={Webhook}
          title="Webhooks"
          description="Webhooks allow you to receive HTTP requests whenever a specific event (eg: someone clicked your link) occurs in Dub."
          learnMore="https://d.to/webhooks"
          buttonText="Upgrade to Business"
          buttonLink={queryParams({
            set: {
              upgrade: "business",
            },
            getNewPath: true,
          })}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap justify-between gap-6">
        <div className="flex items-center gap-x-2">
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            Webhooks
          </h1>
          <InfoTooltip
            content={
              <TooltipContent
                title="Webhooks allow you to receive HTTP requests whenever a specific event (eg: someone clicked your link) occurs in Dub."
                href="https://d.to/webhooks"
                target="_blank"
                cta="Learn more"
              />
            }
          />
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Button
            className="flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm"
            text="Add Webhook"
            onClick={() =>
              router.push(`/${workspace.slug}/settings/webhooks/new`)
            }
            // disabledTooltip={permissionsError}
            // {...(needsHigherPlan && {
            //   disabledTooltip: permissionsError,
            // })}
          />
        </div>
      </div>

      <div className="animate-fade-in">
        {!isLoading ? (
          webhooks && webhooks.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {webhooks.map((webhook) => (
                <WebhookCard {...webhook} key={webhook.id} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 py-10">
              <EmptyState
                icon={Webhook}
                title="You haven't set up any webhooks yet."
                description="Webhooks allow you to receive HTTP requests whenever a specific event (eg: someone clicked your link) occurs in Dub."
                learnMore="https://dub.co/docs/webhooks"
              />
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <WebhookPlaceholder />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
