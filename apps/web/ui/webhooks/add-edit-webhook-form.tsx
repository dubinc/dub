"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import { EXTERNAL_PAYOUTS_PROGRAM_IDS } from "@/lib/constants/program";
import useWorkspace from "@/lib/swr/use-workspace";
import { NewWebhook, WebhookProps } from "@/lib/types";
import {
  LINK_CLICK_WEBHOOK_TRIGGER,
  LINK_LEVEL_WEBHOOK_TRIGGERS,
  PROGRAM_LEVEL_WEBHOOK_TRIGGERS,
  WEBHOOK_SCOPE_OPTIONS,
  WEBHOOK_TRIGGER_DESCRIPTIONS,
  WORKSPACE_LEVEL_WEBHOOK_TRIGGERS,
} from "@/lib/webhook/constants";
import {
  Button,
  Checkbox,
  CircleCheckFill,
  CopyButton,
  InfoTooltip,
  RadioGroup,
  RadioGroupItem,
} from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { WebhookScope } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { FoldersSelector } from "./folder-selector";
import { LinksSelector } from "./link-selector";

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
      scope: webhook?.scope ?? "all",
      linkIds: [],
      folderIds: [],
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  const [name, url, triggers, scope, linkIds, folderIds] = watch([
    "name",
    "url",
    "triggers",
    "scope",
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
          scope: data.scope,
          ...(data.scope === "links" && { linkIds: data.linkIds }),
          ...(data.scope === "folders" && { folderIds: data.folderIds }),
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
      mutate(
        `/api/webhooks/${result.id}/links?workspaceId=${workspaceId}`,
        data.scope === "links" ? data.linkIds : [],
      );
      mutate(
        `/api/webhooks/${result.id}/folders?workspaceId=${workspaceId}`,
        data.scope === "folders" ? data.folderIds : [],
      );
    }

    toast.success(endpoint.successMessage);
  };

  const scopeInvalid =
    hasLinkClicked &&
    ((scope === "links" && linkIds?.length === 0) ||
      (scope === "folders" && folderIds?.length === 0));

  const buttonDisabled =
    !name || !url || !triggers.length || isSubmitting || scopeInvalid;

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
      ...LINK_LEVEL_WEBHOOK_TRIGGERS,
    ],
    [defaultProgramId],
  );

  const toggleTrigger = (
    trigger: NewWebhook["triggers"][number],
    checked: boolean | "indeterminate",
  ) => {
    if (checked === "indeterminate") {
      return;
    }

    setValue(
      "triggers",
      checked ? [...triggers, trigger] : triggers.filter((t) => t !== trigger),
    );
  };

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
          <div className="mt-3 flex flex-col gap-2">
            {allWebhookTriggers.map((trigger) => (
              <div key={trigger}>
                <div className="group flex gap-2">
                  <Checkbox
                    value={trigger}
                    id={trigger}
                    checked={triggers.includes(trigger)}
                    disabled={updateDisabled}
                    onCheckedChange={(checked) =>
                      toggleTrigger(trigger, checked)
                    }
                  />
                  <label
                    htmlFor={trigger}
                    className="flex select-none items-center gap-2 text-sm text-neutral-600 group-hover:text-neutral-800"
                  >
                    {WEBHOOK_TRIGGER_DESCRIPTIONS[trigger]}
                    {trigger === LINK_CLICK_WEBHOOK_TRIGGER ? (
                      <span className="rounded bg-yellow-100 px-1 py-0.5 text-xs font-medium text-yellow-800">
                        High traffic
                      </span>
                    ) : null}
                  </label>
                </div>

                {trigger === LINK_CLICK_WEBHOOK_TRIGGER && hasLinkClicked ? (
                  <LinkClickScopeFields
                    disabled={updateDisabled}
                    webhook={webhook}
                    workspaceId={workspaceId}
                  />
                ) : null}
              </div>
            ))}
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

function LinkClickScopeFields({
  disabled,
  webhook,
  workspaceId,
}: {
  disabled: boolean;
  webhook: WebhookProps | null;
  workspaceId: string | undefined;
}) {
  const { watch, setValue } = useFormContext<NewWebhook>();

  const [scope = "all", linkIds = [], folderIds = []] = watch([
    "scope",
    "linkIds",
    "folderIds",
  ]);

  const { data: fetchedLinkIds } = useSWR<string[]>(
    webhook && webhook.scope === "links"
      ? `/api/webhooks/${webhook.id}/links?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const { data: fetchedFolderIds } = useSWR<string[]>(
    webhook && webhook.scope === "folders"
      ? `/api/webhooks/${webhook.id}/folders?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  useEffect(() => {
    if (webhook?.scope === "links" && fetchedLinkIds) {
      setValue("linkIds", fetchedLinkIds);
    } else if (webhook?.scope === "folders" && fetchedFolderIds) {
      setValue("folderIds", fetchedFolderIds);
    }
  }, [fetchedLinkIds, fetchedFolderIds, webhook?.scope, setValue]);

  return (
    <div className="ml-6 mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <RadioGroup
        value={scope}
        onValueChange={(value) => setValue("scope", value as WebhookScope)}
        className="flex flex-col gap-2"
        disabled={disabled}
      >
        {WEBHOOK_SCOPE_OPTIONS.map((option) => {
          const isSelected = scope === option.value;

          return (
            <div key={option.value}>
              <label
                className={cn(
                  "relative flex w-full cursor-pointer items-start gap-3 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                  "transition-all duration-150",
                  isSelected &&
                    "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <RadioGroupItem
                  value={option.value}
                  id={`scope-${option.value}`}
                  className="mt-0.5"
                  disabled={disabled}
                />
                <div className="flex grow flex-col text-sm">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-neutral-500">{option.description}</span>
                </div>
                <CircleCheckFill
                  className={cn(
                    "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                    isSelected && "scale-100 opacity-100",
                  )}
                />
              </label>

              {isSelected && option.value === "folders" ? (
                <div className="mt-3 pl-7">
                  <h3 className="text-sm font-medium text-neutral-900">
                    Included folders
                  </h3>
                  <div className="mt-2">
                    <FoldersSelector
                      selectedFolderIds={folderIds ?? []}
                      setSelectedFolderIds={(ids) => setValue("folderIds", ids)}
                      disabled={disabled}
                    />
                  </div>
                </div>
              ) : null}

              {isSelected && option.value === "links" ? (
                <div className="mt-3 pl-7">
                  <h3 className="text-sm font-medium text-neutral-900">
                    Included links
                  </h3>
                  <div className="mt-2">
                    <LinksSelector
                      selectedLinkIds={linkIds ?? []}
                      setSelectedLinkIds={(ids) => setValue("linkIds", ids)}
                      disabled={disabled}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
