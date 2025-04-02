"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps, WebhookTrigger } from "@/lib/types";
import {
  LINK_LEVEL_WEBHOOK_TRIGGERS,
  WEBHOOK_TRIGGER_DESCRIPTIONS,
  WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
} from "@/lib/webhook/constants";
import { Link } from "@/ui/shared/icons";
import { LinksSelector } from "@/ui/webhooks/link-selector";
import { Button, Checkbox } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { cn } from "@dub/utils/src/functions";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

export function ConfigureWebhook({
  webhookId,
  supportedEvents,
}: {
  webhookId: string;
  supportedEvents: WebhookTrigger[]; // Not all integrations support all events.
}) {
  const [saving, setSaving] = useState(false);
  const { id: workspaceId, plan, role } = useWorkspace();

  const { data: webhook, isLoading } = useSWR<WebhookProps>(
    `/api/webhooks/${webhookId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  const [data, setData] = useState<Pick<WebhookProps, "linkIds" | "triggers">>({
    linkIds: [],
    triggers: [],
  });

  useEffect(() => {
    if (webhook) {
      setData({
        linkIds: webhook.linkIds,
        triggers: webhook.triggers,
      });
    }
  }, [webhook]);

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.write",
    role,
  });

  // Save the form data
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setSaving(true);

    const response = await fetch(
      `/api/webhooks/${webhookId}?workspaceId=${workspaceId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    setSaving(false);

    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error.message);
      return;
    }

    mutate(`/api/webhooks/${webhookId}?workspaceId=${workspaceId}`, result);
    toast.success("Webhook preferences saved!");
  };

  const { linkIds = [], triggers = [] } = data;

  const canManageWebhook =
    !permissionsError || plan === "free" || plan === "pro";

  const enableLinkSelection = LINK_LEVEL_WEBHOOK_TRIGGERS.some((trigger) =>
    triggers.includes(trigger),
  );

  return (
    <form onSubmit={onSubmit}>
      <div className="w-full rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center gap-x-2 border-b border-neutral-200 px-6 py-4">
          <Link className="size-4" />
          <p className="text-sm font-medium text-neutral-700">Webhook events</p>
        </div>

        <div className="p-4">
          <div>
            <label htmlFor="triggers" className="flex flex-col gap-1">
              <h2 className="text-sm font-medium text-neutral-900">
                Workspace level events
              </h2>
              <span className="text-xs text-neutral-500">
                These events are triggered at the workspace level.
              </span>
            </label>
            <div className="mt-3 flex flex-col gap-2">
              {WORKSPACE_LEVEL_WEBHOOK_TRIGGERS.filter(
                (trigger) =>
                  canManageWebhook && supportedEvents.includes(trigger),
              ).map((trigger) => (
                <div key={trigger} className="group flex gap-2">
                  <Checkbox
                    value={trigger}
                    id={trigger}
                    checked={triggers.includes(trigger)}
                    disabled={
                      !canManageWebhook || !supportedEvents.includes(trigger)
                    }
                    onCheckedChange={(checked) => {
                      setData({
                        ...data,
                        triggers: checked
                          ? [...triggers, trigger]
                          : triggers.filter((t) => t !== trigger),
                      });
                    }}
                    title={
                      !supportedEvents.includes(trigger)
                        ? "Not supported"
                        : undefined
                    }
                  />
                  <label
                    htmlFor={trigger}
                    className={cn(
                      "select-none text-sm text-neutral-600",
                      supportedEvents.includes(trigger)
                        ? "group-hover:text-neutral-800"
                        : "opacity-50",
                    )}
                  >
                    {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="triggers" className="flex flex-col gap-1">
              <h2 className="text-sm font-medium text-neutral-900">
                Link level events{" "}
                <span className="rounded bg-yellow-100 px-1 py-0.5 text-xs font-medium text-yellow-800">
                  High traffic
                </span>
              </h2>
              <span className="text-xs text-neutral-500">
                These events are triggered at the link level.
              </span>
            </label>
            <div className="mt-3 flex flex-col gap-2">
              {LINK_LEVEL_WEBHOOK_TRIGGERS.map((trigger) => (
                <div key={trigger} className="group flex gap-2">
                  <Checkbox
                    value={trigger}
                    id={trigger}
                    checked={triggers.includes(trigger)}
                    disabled={!canManageWebhook}
                    onCheckedChange={(checked) => {
                      setData({
                        ...data,
                        triggers: checked
                          ? [...triggers, trigger]
                          : triggers.filter((t) => t !== trigger),
                      });
                    }}
                  />
                  <label
                    htmlFor={trigger}
                    className="flex select-none items-center gap-2 text-sm text-neutral-600 group-hover:text-neutral-800"
                  >
                    {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                  </label>
                </div>
              ))}
            </div>

            {enableLinkSelection || linkIds.length ? (
              <div className="mt-4">
                <h2 className="text-sm font-medium text-neutral-900">
                  Choose links we should send events for
                </h2>
                <div className="mt-3">
                  <LinksSelector
                    selectedLinkIds={linkIds}
                    setSelectedLinkIds={(ids) =>
                      setData({
                        ...data,
                        linkIds: ids,
                      })
                    }
                    disabled={!canManageWebhook}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="shrink-0">
            <Button
              text="Save changes"
              loading={saving}
              type="submit"
              {...(permissionsError && {
                disabledTooltip: permissionsError,
              })}
              disabled={!canManageWebhook || isLoading}
              className="h-8"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
