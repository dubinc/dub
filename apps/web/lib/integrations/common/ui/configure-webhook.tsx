"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps } from "@/lib/types";
import {
  LINK_CLICK_WEBHOOK_TRIGGER,
  PROGRAM_LEVEL_WEBHOOK_TRIGGERS,
  WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
} from "@/lib/webhook/constants";
import type { WebhookTrigger } from "@/lib/webhook/types";
import { Link } from "@/ui/shared/icons";
import {
  isWebhookTriggerSelectionInvalid,
  WebhookTriggerSelector,
  WebhookTriggerSelectorValue,
} from "@/ui/webhooks/webhook-trigger-selector";
import { Button } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
  const { id: workspaceId, plan, role, defaultProgramId } = useWorkspace();

  const { data: webhook, isLoading } = useSWR<WebhookProps>(
    `/api/webhooks/${webhookId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  const [triggerSelection, setTriggerSelection] =
    useState<WebhookTriggerSelectorValue>({
      triggers: [],
      linkScope: "workspace",
      linkIds: [],
      folderIds: [],
    });

  useEffect(() => {
    if (webhook) {
      setTriggerSelection((prev) => ({
        ...prev,
        triggers: webhook.triggers,
        linkScope: webhook.linkScope ?? "workspace",
      }));
    }
  }, [webhook]);

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.write",
    role,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setSaving(true);

    const { triggers, linkScope, linkIds, folderIds } = triggerSelection;
    const hasLinkClicked = triggers.includes(LINK_CLICK_WEBHOOK_TRIGGER);

    const response = await fetch(
      `/api/webhooks/${webhookId}?workspaceId=${workspaceId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          triggers,
          ...(hasLinkClicked && {
            linkScope,
            ...(linkScope === "links" && { linkIds }),
            ...(linkScope === "folders" && { folderIds }),
          }),
        }),
      },
    );

    setSaving(false);

    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error.message);
      return;
    }

    mutate(`/api/webhooks/${webhookId}?workspaceId=${workspaceId}`, result);
    await Promise.all([
      mutate(
        `/api/webhooks/${webhookId}/links?workspaceId=${workspaceId}`,
        result.linkScope === "links" ? linkIds : [],
        { revalidate: true },
      ),
      mutate(
        `/api/webhooks/${webhookId}/folders?workspaceId=${workspaceId}`,
        result.linkScope === "folders" ? folderIds : [],
        { revalidate: true },
      ),
    ]);
    toast.success("Webhook preferences saved!");
  };

  const canManageWebhook =
    !permissionsError || plan === "free" || plan === "pro";

  const availableTriggers = useMemo(
    () =>
      [
        ...WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
        ...(defaultProgramId ? PROGRAM_LEVEL_WEBHOOK_TRIGGERS : []),
      ].filter((trigger) => supportedEvents.includes(trigger)),
    [defaultProgramId, supportedEvents],
  );

  const selectionInvalid = isWebhookTriggerSelectionInvalid(triggerSelection);

  return (
    <form onSubmit={onSubmit}>
      <div className="w-full rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center gap-x-2 border-b border-neutral-200 px-6 py-4">
          <Link className="size-4" />
          <p className="text-sm font-medium text-neutral-700">Webhook events</p>
        </div>

        <div className="p-4">
          <WebhookTriggerSelector
            value={triggerSelection}
            onChange={setTriggerSelection}
            availableTriggers={availableTriggers}
            disabled={!canManageWebhook}
            webhookId={webhookId}
            savedLinkScope={webhook?.linkScope}
          />
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
              disabled={!canManageWebhook || isLoading || selectionInvalid}
              className="h-8"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
