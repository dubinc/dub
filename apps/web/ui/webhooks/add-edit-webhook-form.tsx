"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useLinks from "@/lib/swr/use-links";
import useWorkspace from "@/lib/swr/use-workspace";
import { NewWebhook, WebhookProps } from "@/lib/types";
import {
  LINK_LEVEL_WEBHOOK_TRIGGERS,
  WEBHOOK_TRIGGER_DESCRIPTIONS,
  WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
} from "@/lib/webhook/constants";
import { Button, Checkbox, CopyButton, InfoTooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import { redirect, useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

const defaultValues: NewWebhook = {
  name: "Webhook name",
  url: "https://example.com",
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
  const { slug: workspaceSlug, id: workspaceId, flags, role } = useWorkspace();
  const { links } = useLinks();

  if (!flags?.webhooks) {
    redirect(`/${workspaceSlug}`);
  }

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

    console.log(data);

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    setSaving(false);
    const result = await response.json();

    if (response.ok) {
      mutate(`/api/webhooks/${result.id}?workspaceId=${workspaceId}`, result);
      toast.success(endpoint.successMessage);

      if (endpoint.method === "POST") {
        router.push(`/${workspaceSlug}/settings/webhooks`);
      }
    } else {
      toast.error(result.error.message);
    }
  };

  const { name, url, secret, triggers, linkIds } = data;
  const buttonDisabled = !name || !url || !triggers.length || saving;
  const canManageWebhook = !permissionsError;
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
            <h2 className="text-sm font-medium text-gray-900">Name</h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-50": !canManageWebhook,
                },
              )}
              required
              value={name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              autoFocus
              autoComplete="off"
              placeholder="Webhook name"
              disabled={!canManageWebhook}
            />
          </div>
        </div>

        <div>
          <label htmlFor="url" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">URL</h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-50": !canManageWebhook,
                },
              )}
              required
              value={url}
              onChange={(e) => setData({ ...data, url: e.target.value })}
              autoComplete="off"
              placeholder="Webhook URL"
              disabled={!canManageWebhook}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">
              Signing secret
            </h2>
            <InfoTooltip content="A secret token used to sign the webhook payload." />
          </label>
          <div className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-1">
            <p className="text-nowrap font-mono text-sm text-gray-500">
              {secret}
            </p>
            <div className="flex flex-col gap-2">
              <CopyButton value={secret} className="rounded-md" />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <label htmlFor="triggers" className="flex flex-col gap-1">
            <h2 className="text-sm font-medium text-gray-900">
              Workspace level events
            </h2>
            <span className="text-xs text-gray-500">
              These events are triggered at the workspace level.
            </span>
          </label>
          <div className="mt-3 flex flex-col gap-4">
            {WORKSPACE_LEVEL_WEBHOOK_TRIGGERS.map((trigger) => (
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
                  className="select-none text-sm font-medium text-gray-600 group-hover:text-gray-800"
                >
                  {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <label htmlFor="triggers" className="flex flex-col gap-1">
            <h2 className="text-sm font-medium text-gray-900">
              Link level events
            </h2>
            <span className="text-xs text-gray-500">
              These events are triggered at the link level. You can choose which
              links you want to listen for events on.
            </span>
          </label>
          <div className="mt-3 flex flex-col gap-4">
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
                  className="select-none text-sm font-medium text-gray-600 group-hover:text-gray-800"
                >
                  {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label htmlFor="triggers" className="flex items-center space-x-2">
              <h2 className="text-sm font-medium text-gray-900">
                Choose which link we should send events for
              </h2>
            </label>
            <div className="mt-3 flex flex-col gap-4">
              <div className="max-h-[200px] min-h-[100px] overflow-y-auto border-b border-gray-200 pb-2">
                {links?.map((link) => (
                  <div key={link.id} className="group flex h-8 gap-2 py-1">
                    <Checkbox
                      value={link.id}
                      id={`link-${link.id}`}
                      checked={linkIds?.includes(link.id)}
                      disabled={
                        !canManageWebhook ||
                        (!enableLinkSelection && !linkIds?.length)
                      }
                      onCheckedChange={(checked) => {
                        setData({
                          ...data,
                          linkIds: checked
                            ? [...(linkIds || []), link.id]
                            : (linkIds || []).filter((id) => id !== link.id),
                        });
                      }}
                    />
                    <label
                      htmlFor={`link-${link.id}`}
                      className="select-none text-sm font-medium text-gray-600 group-hover:text-gray-800"
                    >
                      {link.domain}/{link.key}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Button
          text={webhook ? "Save changes" : "Create webhook"}
          disabled={buttonDisabled}
          loading={saving}
          type="submit"
          {...(permissionsError && {
            disabledTooltip: permissionsError,
          })}
        />
      </form>
    </>
  );
}
