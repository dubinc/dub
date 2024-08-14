"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { NewWebhook, WebhookProps } from "@/lib/types";
import { WEBHOOK_TRIGGERS } from "@/lib/webhook/constants";
import { Button, Checkbox, InfoTooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import { redirect, useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

const defaultValues: NewWebhook = {
  name: "",
  linkId: "",
  url: "",
  secret: "",
  triggers: ["link.created"],
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

  const { name, url, secret, triggers, linkId } = data;

  const buttonDisabled = !name || !url || !triggers.length || saving;
  const canManageWebhook = !permissionsError;

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="flex flex-col space-y-5 pb-20 text-left"
      >
        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">Name</h2>
            <InfoTooltip content="An easily identifiable name for your webhook." />
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
            <h2 className="text-sm font-medium text-gray-900">Endpoint URL</h2>
            <InfoTooltip content="The URL where the webhook will send POST requests." />
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
              placeholder="https://example.com/webhook"
              disabled={!canManageWebhook}
            />
          </div>
        </div>

        <div>
          <label htmlFor="secret" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">
              Signing secret
            </h2>
            <InfoTooltip content="A secret token used to sign the webhook payload." />
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className="block w-full cursor-not-allowed rounded-md border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              required
              value={secret}
              onChange={(e) => setData({ ...data, url: e.target.value })}
              autoComplete="off"
              readOnly
              disabled
            />
          </div>
        </div>

        <div>
          <label htmlFor="triggers" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">
              Events to send
            </h2>
            <InfoTooltip content="Select the events that will trigger the webhook." />
          </label>
          <div className="mt-3 flex flex-col gap-4">
            {WEBHOOK_TRIGGERS.map((trigger) => (
              <div key={trigger} className="group flex gap-2">
                <Checkbox
                  value={trigger}
                  id={trigger}
                  checked={triggers.includes(trigger)}
                  disabled={!canManageWebhook}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setData({ ...data, triggers: [...triggers, trigger] });
                    } else {
                      setData({
                        ...data,
                        triggers: triggers.filter((t) => t !== trigger),
                      });
                    }
                  }}
                />
                <label
                  htmlFor={trigger}
                  className="select-none text-sm font-medium text-gray-600 group-hover:text-gray-800"
                >
                  {trigger}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button
          text={webhook ? "Save changes" : "Create"}
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
