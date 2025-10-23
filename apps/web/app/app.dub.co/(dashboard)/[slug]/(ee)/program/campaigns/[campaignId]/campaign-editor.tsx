import { uploadEmailImageAction } from "@/lib/actions/partners/upload-email-image";
import { CAMPAIGN_READONLY_STATUSES } from "@/lib/api/campaigns/constants";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign, UpdateCampaignFormData } from "@/lib/types";
import { EMAIL_TEMPLATE_VARIABLES } from "@/lib/zod/schemas/campaigns";
import { PageContentWithSidePanel } from "@/ui/layout/page-content/page-content-with-side-panel";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CampaignStatus } from "@dub/prisma/client";
import {
  Button,
  ChevronRight,
  Lock,
  PaperPlane,
  RichTextArea,
  SmartDateTimePicker,
  StatusBadge,
  Tooltip,
  useKeyboardShortcut,
} from "@dub/ui";
import { capitalize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { CAMPAIGN_STATUS_BADGES } from "../campaign-status-badges";
import { CampaignActionBar } from "./campaign-action-bar";
import { CampaignControls } from "./campaign-controls";
import { CampaignEvents } from "./campaign-events";
import { CampaignGroupsSelector } from "./campaign-groups-selector";
import { CampaignMetrics } from "./campaign-metrics";
import { EmailDomainSelector } from "./email-domain-selector";
import { TransactionalCampaignLogic } from "./transactional-campaign-logic";
import { isValidTriggerCondition } from "./utils";

const inputClassName =
  "hover:border-border-subtle h-8 w-full rounded-md transition-colors duration-150 focus:border-black/75 border focus:ring-black/75 border-transparent px-1.5 py-0 text-sm text-content-default placeholder:text-content-muted hover:bg-neutral-100 hover:cursor-pointer";

const labelClassName = "text-sm font-medium text-content-subtle";

const DisabledInputWrapper = ({
  children,
  tooltip,
  disabled = false,
  hideIcon = false,
}: {
  children: React.ReactNode;
  tooltip: string;
  disabled?: boolean;
  hideIcon?: boolean;
}) => {
  if (!disabled) {
    return <>{children}</>;
  }

  return (
    <Tooltip content={tooltip}>
      <div className="relative">
        <div className="pointer-events-none select-none opacity-80">
          {children}
        </div>
        {!hideIcon && (
          <Lock className="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-neutral-400" />
        )}
      </div>
    </Tooltip>
  );
};

const statusMessages = {
  sending: "Edits aren't allowed while sending.",
  sent: "Edits aren't allowed after sending.",
  cancelled: "Edits aren't allowed after cancellation.",
};

export function CampaignEditor({ campaign }: { campaign: Campaign }) {
  const { program } = useProgram();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const isActive = useMemo(
    () => campaign.status === CampaignStatus.active,
    [campaign.status],
  );

  const isReadOnly = useMemo(
    () => CAMPAIGN_READONLY_STATUSES.includes(campaign.status),
    [campaign.status],
  );

  const { makeRequest, isSubmitting: isSavingCampaign } =
    useApiMutation<Campaign>();

  const form = useForm<UpdateCampaignFormData>({
    defaultValues: {
      name: campaign.name,
      subject: campaign.subject,
      from: campaign.from ?? undefined,
      bodyJson: campaign.bodyJson,
      groupIds: campaign.groups.map(({ id }) => id),
      triggerCondition: campaign.triggerCondition,
      scheduledAt: campaign.scheduledAt,
    },
  });

  const {
    register,
    control,
    watch,
    getValues,
    reset,
    formState: { dirtyFields },
  } = form;

  const saveCampaign = useCallback(
    async ({ isDraft = false }: { isDraft?: boolean }) => {
      const allFormData = getValues();

      // Only send fields that have changed (PATCH)
      const changedFields = Object.keys(dirtyFields).reduce(
        (acc, key) => {
          if (dirtyFields[key as keyof typeof dirtyFields]) {
            acc[key] = allFormData[key as keyof UpdateCampaignFormData];
          }

          return acc;
        },
        {} as Record<string, any>,
      );

      if (Object.keys(changedFields).length > 0) {
        if ("groupIds" in changedFields) {
          changedFields.groupIds = Array.isArray(changedFields.groupIds)
            ? changedFields.groupIds
            : null;
        }

        // Remove invalid triggerCondition when saving a draft to prevent API validation errors
        if (isDraft && "triggerCondition" in changedFields) {
          if (!isValidTriggerCondition(changedFields.triggerCondition)) {
            delete changedFields.triggerCondition;
          }
        }

        if (Object.keys(changedFields).length === 0) {
          return;
        }

        await makeRequest(`/api/campaigns/${campaign.id}`, {
          method: "PATCH",
          body: changedFields,
          onSuccess: () => {
            reset(allFormData, { keepValues: true, keepDirty: false });
            if (!isDraft) {
              toast.success("Campaign saved successfully!");
            }
          },
          onError: (error) => {
            toast.error(error);
          },
        });
      }
    },
    [
      isSavingCampaign,
      getValues,
      dirtyFields,
      watch,
      makeRequest,
      campaign.id,
      reset,
    ],
  );

  // Debounced auto-save for draft campaigns
  const saveDraftCampaign = useDebouncedCallback(async () => {
    if (campaign.status !== CampaignStatus.draft) {
      return;
    }

    await saveCampaign({ isDraft: true });
  }, 1000);

  // Watch for form changes and trigger autosave (only for draft campaigns)
  useEffect(() => {
    const { unsubscribe } = watch(() => {
      if (campaign.status !== CampaignStatus.draft) {
        return;
      }

      saveDraftCampaign();
    });

    return () => unsubscribe();
  }, [watch, campaign.status]);

  // Override CMD/CTRL+S to show autosave toast
  useKeyboardShortcut(
    ["meta+s", "ctrl+s"],
    () => {
      if (campaign.status === CampaignStatus.draft) {
        toast.success("Your content is automatically saved as you type!");
      } else {
        // For non-draft campaigns, trigger manual save
        saveCampaign({ isDraft: false });
      }
    },
    { enabled: true },
  );

  const { executeAsync: executeImageUpload } = useAction(
    uploadEmailImageAction,
  );

  const statusBadge = CAMPAIGN_STATUS_BADGES[campaign.status];

  const editorRef = useRef<{ setContent: (content: any) => void }>(null);

  return (
    <FormProvider {...form}>
      <PageContentWithSidePanel
        title={
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <Link
                href={`/${workspaceSlug}/program/campaigns`}
                className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
              >
                <PaperPlane className="text-content-default size-4" />
              </Link>
              <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
            </div>

            <div className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 truncate text-lg font-semibold leading-7 text-neutral-900">
                {campaign.status === CampaignStatus.draft ? (
                  <>
                    New{" "}
                    <span className="hidden sm:inline">{campaign.type}</span>{" "}
                    email
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      {capitalize(campaign.type)} email
                    </span>
                    <span className="inline sm:hidden">Email</span>
                  </>
                )}
              </span>
              <StatusBadge variant={statusBadge.variant} icon={null}>
                {statusBadge.label}
              </StatusBadge>
            </div>
          </div>
        }
        controls={<CampaignControls campaign={campaign} />}
        sidePanel={
          !["draft", "scheduled"].includes(campaign.status)
            ? {
                title: "Metrics",
                content: (
                  <div className="flex grow flex-col gap-4">
                    <CampaignMetrics />
                    <CampaignEvents />
                  </div>
                ),
                defaultOpen: ["active", "sending", "sent"].includes(
                  campaign.status,
                ),
              }
            : undefined
        }
        individualScrolling
        contentWrapperClassName="flex flex-col"
      >
        <PageWidthWrapper className="mb-8 max-w-[600px]">
          <div className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-6 gap-y-2">
            <span className={labelClassName}>Name</span>
            <DisabledInputWrapper
              tooltip={isReadOnly ? statusMessages[campaign.status] : ""}
              disabled={isReadOnly}
              hideIcon={true}
            >
              <input
                type="text"
                placeholder="Enter a name..."
                className={inputClassName}
                disabled={isReadOnly}
                {...register("name")}
              />
            </DisabledInputWrapper>

            <label className="contents">
              <span className={labelClassName}>From</span>
              <Controller
                control={control}
                name="from"
                render={({ field }) => (
                  <EmailDomainSelector
                    selectedFromAddress={field.value || ""}
                    setSelectedFromAddress={field.onChange}
                    disabled={isReadOnly}
                    disabledTooltip={
                      isReadOnly ? statusMessages[campaign.status] : undefined
                    }
                  />
                )}
              />
            </label>

            <span className={labelClassName}>To</span>
            <Controller
              control={control}
              name="groupIds"
              render={({ field }) => (
                <DisabledInputWrapper
                  tooltip={
                    isReadOnly
                      ? statusMessages[campaign.status]
                      : "Cannot change recipients while campaign is active. Pause the campaign to make changes."
                  }
                  disabled={isActive || isReadOnly}
                  hideIcon={isReadOnly}
                >
                  <CampaignGroupsSelector
                    selectedGroupIds={field.value ?? null}
                    setSelectedGroupIds={field.onChange}
                  />
                </DisabledInputWrapper>
              )}
            />

            {campaign.type === "marketing" && (
              <>
                <span className={labelClassName}>When</span>
                <Controller
                  control={control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <DisabledInputWrapper
                      tooltip={
                        isReadOnly ? statusMessages[campaign.status] : undefined
                      }
                      disabled={isReadOnly}
                      hideIcon={true}
                    >
                      <SmartDateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder='E.g. "tomorrow at 5pm" or "in 2 hours"'
                        className="[&>div]:hover:border-border-subtle [&>div]:mt-0 [&>div]:h-8 [&>div]:min-h-8 [&>div]:border-transparent [&>div]:shadow-none [&>div]:focus-within:border-black/75 [&>div]:focus-within:ring-black/75 [&>div]:hover:cursor-pointer [&>div]:hover:bg-neutral-100"
                      />
                    </DisabledInputWrapper>
                  )}
                />
              </>
            )}

            <span className={labelClassName}>Subject</span>
            <DisabledInputWrapper
              tooltip={isReadOnly ? statusMessages[campaign.status] : ""}
              disabled={isReadOnly}
              hideIcon={true}
            >
              <input
                type="text"
                placeholder="Enter a subject..."
                className={inputClassName}
                disabled={isReadOnly}
                {...register("subject")}
              />
            </DisabledInputWrapper>

            {campaign.type === "transactional" && (
              <>
                <span className={labelClassName}>Logic</span>
                <DisabledInputWrapper
                  tooltip={
                    isReadOnly
                      ? statusMessages[campaign.status]
                      : "Cannot change trigger logic while campaign is active. Pause the campaign to make changes."
                  }
                  disabled={isActive || isReadOnly}
                >
                  <TransactionalCampaignLogic />
                </DisabledInputWrapper>
              </>
            )}
          </div>

          <div className="mt-6">
            <Controller
              control={control}
              name="bodyJson"
              render={({ field }) => (
                <RichTextArea
                  ref={editorRef}
                  editorClassName="-m-2 min-h-[200px] p-2"
                  initialValue={field.value}
                  onChange={(editor) => field.onChange(editor.getJSON())}
                  variables={[...EMAIL_TEMPLATE_VARIABLES]}
                  editable={
                    campaign.type === "marketing" ? !isReadOnly : !isActive
                  }
                  uploadImage={async (file) => {
                    try {
                      const result = await executeImageUpload({
                        workspaceId: workspaceId!,
                      });

                      if (!result?.data) {
                        throw new Error("Failed to get signed upload URL");
                      }

                      const { signedUrl, destinationUrl } = result.data;

                      const uploadResponse = await fetch(signedUrl, {
                        method: "PUT",
                        body: file,
                        headers: {
                          "Content-Type": file.type,
                          "Content-Length": file.size.toString(),
                        },
                      });

                      if (!uploadResponse.ok) {
                        throw new Error("Failed to upload to signed URL");
                      }

                      return destinationUrl;
                    } catch (e) {
                      console.error("Failed to upload image", e);
                      toast.error("Failed to upload image");
                    }

                    return null;
                  }}
                />
              )}
            />
          </div>

          {program?.messagingEnabledAt && campaign.type === "transactional" && (
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Lock className="size-4 shrink-0 text-blue-500" />
                <span className="text-sm font-medium text-blue-900">
                  Allows the partner to respond in messages with any questions.
                </span>
              </div>
              <Button
                text="Respond in Dub"
                className="pointer-events-none h-9 select-none rounded-lg"
                aria-hidden
              />
            </div>
          )}

          <div className="border-border-subtle mt-4 w-full border-t pt-4 text-center text-xs font-medium text-neutral-300">
            End of email
          </div>
        </PageWidthWrapper>

        <div className="min-h-16 grow" />

        <CampaignActionBar
          campaignStatus={campaign.status}
          onSave={() => saveCampaign({ isDraft: false })}
          isSaving={isSavingCampaign}
          onReset={() => {
            editorRef.current?.setContent(campaign.bodyJson);
          }}
        />
      </PageContentWithSidePanel>
    </FormProvider>
  );
}
