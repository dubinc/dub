"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import { EXTERNAL_PAYOUTS_PROGRAM_IDS } from "@/lib/constants/program";
import useWorkspace from "@/lib/swr/use-workspace";
import { NewWebhook, WebhookProps } from "@/lib/types";
import {
  LINK_CLICK_WEBHOOK_TRIGGER,
  PROGRAM_LEVEL_WEBHOOK_TRIGGERS,
  WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
} from "@/lib/webhook/constants";
import { Button, CopyButton, InfoTooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import {
  isWebhookTriggerSelectionInvalid,
  WebhookTriggerSelector,
} from "./webhook-trigger-selector";

export default function AddEditWebhookForm({
  webhook,
}: {
  webhook: WebhookProps | null;
}) {
  const router = useRouter();
  const {
    id: workspaceId,
    slug: workspaceSlug,
    role,
    defaultProgramId,
  } = useWorkspace();

  const methods = useForm<NewWebhook>({
    defaultValues: {
      name: webhook?.name ?? "",
      url: webhook?.url ?? "",
      triggers: webhook?.triggers ?? [],
      linkScope: webhook?.linkScope ?? "workspace",
      linkIds: [],
      folderIds: [],
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = methods;

  const [name, url, triggers, linkScope, linkIds, folderIds] = watch([
    "name",
    "url",
    "triggers",
    "linkScope",
    "linkIds",
    "folderIds",
  ]);

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.write",
    role,
  });

  const endpoint = useMemo(() => {
    if (webhook) {
      return {
        method: "PATCH" as const,
        url: `/api/webhooks/${webhook.id}?workspaceId=${workspaceId}`,
        successMessage: "Webhook updated!",
      };
    }

    return {
      method: "POST" as const,
      url: `/api/webhooks?workspaceId=${workspaceId}`,
      successMessage: "Webhook created!",
    };
  }, [webhook, workspaceId]);

  const hasLinkClicked = triggers.includes(LINK_CLICK_WEBHOOK_TRIGGER);

  const onSubmit = async (data: NewWebhook) => {
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        url: data.url,
        triggers: data.triggers,
        ...(hasLinkClicked && {
          linkScope: data.linkScope,
          ...(data.linkScope === "links" && { linkIds: data.linkIds }),
          ...(data.linkScope === "folders" && { folderIds: data.folderIds }),
        }),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error.message);
      return;
    }

    if (endpoint.method === "POST") {
      mutate(`/api/webhooks?workspaceId=${workspaceId}`);
      mutate(`/api/webhooks/${result.id}?workspaceId=${workspaceId}`, result);
      router.push(`/${workspaceSlug}/settings/webhooks/${result.id}/edit`);
    } else {
      mutate(`/api/webhooks/${result.id}?workspaceId=${workspaceId}`, result);
      await Promise.all([
        mutate(
          `/api/webhooks/${result.id}/links?workspaceId=${workspaceId}`,
          result.linkScope === "links" ? data.linkIds ?? [] : [],
          { revalidate: true },
        ),
        mutate(
          `/api/webhooks/${result.id}/folders?workspaceId=${workspaceId}`,
          result.linkScope === "folders" ? data.folderIds ?? [] : [],
          { revalidate: true },
        ),
      ]);

      reset({
        name: result.name,
        url: result.url,
        triggers: result.triggers,
        linkScope: result.linkScope ?? "workspace",
        linkIds: result.linkScope === "links" ? data.linkIds ?? [] : [],
        folderIds: result.linkScope === "folders" ? data.folderIds ?? [] : [],
      });
    }

    toast.success(endpoint.successMessage);
  };

  const linkScopeInvalid = isWebhookTriggerSelectionInvalid({
    triggers,
    linkScope: linkScope ?? "workspace",
    linkIds: linkIds ?? [],
    folderIds: folderIds ?? [],
  });

  const buttonDisabled =
    !name || !url || !triggers.length || isSubmitting || linkScopeInvalid;

  const updateDisabled =
    (webhook && webhook?.installationId !== null) || permissionsError !== false;

  const disabledTooltip =
    webhook && webhook?.installationId
      ? `This webhook is managed by an integration.`
      : permissionsError
        ? permissionsError
        : undefined;

  const allWebhookTriggers = useMemo(
    () => [
      ...WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
      ...(defaultProgramId
        ? PROGRAM_LEVEL_WEBHOOK_TRIGGERS.filter(
            (trigger) =>
              trigger !== "payout.confirmed" ||
              EXTERNAL_PAYOUTS_PROGRAM_IDS.includes(defaultProgramId),
          )
        : []),
    ],
    [defaultProgramId],
  );

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col space-y-5 pb-20 text-left"
      >
        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">Name</h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              id="name"
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-50": updateDisabled,
                },
              )}
              required
              autoFocus
              autoComplete="off"
              placeholder="Webhook name"
              disabled={updateDisabled}
              {...register("name")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="url" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">URL</h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              id="url"
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-50": updateDisabled,
                },
              )}
              required
              autoComplete="off"
              placeholder="Webhook URL"
              disabled={updateDisabled}
              {...register("url")}
            />
          </div>
        </div>

        {webhook ? (
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <h2 className="text-sm font-medium text-neutral-900">
                Signing secret
              </h2>
              <InfoTooltip content="A secret token used to sign the webhook payload." />
            </label>
            <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1">
              <p className="text-nowrap font-mono text-sm text-neutral-500">
                {webhook.secret}
              </p>
              <CopyButton value={webhook.secret} className="rounded-md" />
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="triggers">
            <h2 className="text-sm font-medium text-neutral-900">
              Webhook events
            </h2>
          </label>
          <div className="mt-3">
            <WebhookTriggerSelector
              value={{
                triggers,
                linkScope: linkScope ?? "workspace",
                linkIds: linkIds ?? [],
                folderIds: folderIds ?? [],
              }}
              onChange={(next) => {
                setValue("triggers", next.triggers);
                setValue("linkScope", next.linkScope);
                setValue("linkIds", next.linkIds);
                setValue("folderIds", next.folderIds);
              }}
              availableTriggers={allWebhookTriggers}
              disabled={updateDisabled}
              webhookId={webhook?.id}
              savedLinkScope={webhook?.linkScope}
            />
          </div>
        </div>

        <Button
          text={webhook ? "Save changes" : "Create webhook"}
          disabled={buttonDisabled || updateDisabled}
          loading={isSubmitting}
          type="submit"
          {...(disabledTooltip && {
            disabledTooltip,
          })}
        />
      </form>
    </FormProvider>
  );
}
