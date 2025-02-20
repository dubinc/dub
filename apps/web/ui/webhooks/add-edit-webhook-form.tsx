"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { NewWebhook, WebhookProps } from "@/lib/types";
import {
  LINK_LEVEL_WEBHOOK_TRIGGERS,
  WEBHOOK_TRIGGER_DESCRIPTIONS,
  WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
} from "@/lib/webhook/constants";
import { Button, Checkbox, CopyButton, InfoTooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { LinksSelector } from "./link-selector";

const defaultValues: NewWebhook = {
  name: "",
  url: "",
  secret: "",
  triggers: [],
  linkIds: [],
};

export default function AddEditWebhookForm({
  webhook,
  newSecret,
}: {
  webhook: WebhookProps | null;
  newSecret?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const {
    id: workspaceId,
    slug: workspaceSlug,
    role,
    partnersEnabled,
  } = useWorkspace();

  const [data, setData] = useState<NewWebhook | WebhookProps>(
    webhook || {
      ...defaultValues,
      ...(newSecret && { secret: newSecret }),
    },
  );

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.write",
    role,
  });

  // Determine the endpoint
  const endpoint = useMemo(() => {
    if (webhook) {
      return {
        method: "PATCH",
        url: `/api/webhooks/${webhook.id}?workspaceId=${workspaceId}`,
        successMessage: "Webhook updated!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/webhooks?workspaceId=${workspaceId}`,
        successMessage: "Webhook created!",
      };
    }
  }, [webhook]);

  // Save the form data
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    setSaving(false);
    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error.message);
      return;
    }

    if (endpoint.method === "POST") {
      mutate(`/api/webhooks?workspaceId=${workspaceId}`);
      router.push(`/${workspaceSlug}/settings/webhooks`);
    } else {
      mutate(`/api/webhooks/${result.id}?workspaceId=${workspaceId}`, result);
    }

    toast.success(endpoint.successMessage);
  };

  const { name, url, secret, triggers, linkIds = [] } = data;

  const buttonDisabled = !name || !url || !triggers.length || saving;

  const updateDisabled =
    (webhook && webhook?.installationId !== null) || permissionsError !== false;

  const disabledTooltip =
    webhook && webhook?.installationId
      ? `This webhook is managed by an integration.`
      : permissionsError
        ? permissionsError
        : undefined;

  const enableLinkSelection = LINK_LEVEL_WEBHOOK_TRIGGERS.some((trigger) =>
    triggers.includes(trigger),
  );

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="flex flex-col space-y-5 pb-20 text-left"
      >
        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">Name</h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-50": updateDisabled,
                },
              )}
              required
              value={name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              autoFocus
              autoComplete="off"
              placeholder="Webhook name"
              disabled={updateDisabled}
            />
          </div>
        </div>

        <div>
          <label htmlFor="url" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">URL</h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-50": updateDisabled,
                },
              )}
              required
              value={url}
              onChange={(e) => setData({ ...data, url: e.target.value })}
              autoComplete="off"
              placeholder="Webhook URL"
              disabled={updateDisabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">
              Signing secret
            </h2>
            <InfoTooltip content="A secret token used to sign the webhook payload." />
          </label>
          <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-white px-3 py-1">
            <p className="text-nowrap font-mono text-sm text-neutral-500">
              {secret}
            </p>
            <div className="flex flex-col gap-2">
              <CopyButton value={secret!} className="rounded-md" />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 p-4">
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
              // if partners are not enabled, don't show partner.created
              (trigger) => partnersEnabled || trigger !== "partner.created",
            ).map((trigger) => (
              <div key={trigger} className="group flex gap-2">
                <Checkbox
                  value={trigger}
                  id={trigger}
                  checked={triggers.includes(trigger)}
                  disabled={updateDisabled}
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
                  className="select-none text-sm text-neutral-600 group-hover:text-neutral-800"
                >
                  {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 p-4">
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
                  disabled={updateDisabled}
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
                  disabled={updateDisabled}
                />
              </div>
            </div>
          ) : null}
        </div>

        <Button
          text={webhook ? "Save changes" : "Create webhook"}
          disabled={buttonDisabled || updateDisabled}
          loading={saving}
          type="submit"
          {...(disabledTooltip && {
            disabledTooltip,
          })}
        />
      </form>
    </>
  );
}
