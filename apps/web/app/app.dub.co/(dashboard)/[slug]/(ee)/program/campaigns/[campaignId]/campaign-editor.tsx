import { uploadEmailImageAction } from "@/lib/actions/partners/upload-email-image";
import { CAMPAIGN_READONLY_STATUSES } from "@/lib/api/campaigns/constants";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { useEmailDomains } from "@/lib/swr/use-email-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign, UpdateCampaignFormData } from "@/lib/types";
import { EMAIL_TEMPLATE_VARIABLES } from "@/lib/zod/schemas/campaigns";
import { PageContentWithSidePanel } from "@/ui/layout/page-content/page-content-with-side-panel";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CampaignStatus } from "@dub/prisma/client";
import {
  ChevronRight,
  Lock,
  PaperPlane,
  RichTextArea,
  RichTextProvider,
  RichTextToolbar,
  SmartDateTimePicker,
  StatusBadge,
  Tooltip,
  TooltipContent,
  useKeyboardShortcut,
} from "@dub/ui";
import { capitalize, cn } from "@dub/utils";
import { motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { CAMPAIGN_STATUS_BADGES } from "../campaign-status-badges";
import { CampaignActionBar } from "./campaign-action-bar";
import { CampaignControls } from "./campaign-controls";
import { CampaignEvents } from "./campaign-events";
import { CampaignGroupsSelector } from "./campaign-groups-selector";
import { CampaignMetrics } from "./campaign-metrics";
import { DuplicateLogicWarning } from "./duplicate-logic-warning";
import { TransactionalCampaignLogic } from "./transactional-campaign-logic";
import { isValidTriggerCondition } from "./utils";

const inputClassName =
  "hover:border-border-subtle h-8 w-full rounded-md transition-colors duration-150 focus:border-black/75 border focus:ring-black/75 border-transparent px-1.5 py-0 sm:text-sm text-content-default placeholder:text-content-muted hover:bg-neutral-100 hover:cursor-pointer";

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
  canceled: "Edits aren't allowed after cancellation.",
};

export function CampaignEditor({ campaign }: { campaign: Campaign }) {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const { emailDomains } = useEmailDomains();
  const firstVerifiedEmailDomain = emailDomains?.find(
    (domain) => domain.status === "verified",
  );

  const isActive = campaign.status === CampaignStatus.active;
  const isReadOnly = CAMPAIGN_READONLY_STATUSES.includes(campaign.status);

  const { makeRequest, isSubmitting: isSavingCampaign } =
    useApiMutation<Campaign>();

  const form = useForm<UpdateCampaignFormData>({
    defaultValues: {
      name: campaign.name,
      subject: campaign.subject,
      preview: campaign.preview,
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

  const previewInputRef = useRef<HTMLInputElement>(null);

  const [showPreviewText, setShowPreviewText] = useState(
    Boolean(campaign.preview),
  );

  // Show preview text when preview is set
  useEffect(() => {
    const { unsubscribe } = watch(({ preview }) => {
      if (preview) setShowPreviewText(true);
    });
    return () => unsubscribe();
  }, [watch]);

  // Focus preview input when opened
  useEffect(() => {
    if (showPreviewText && !getValues("preview"))
      previewInputRef.current?.focus();
  }, [showPreviewText, getValues]);

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
  const previewInputProps = register("preview", {
    onBlur: (e) => {
      if (!e.target.value) setShowPreviewText(false);
    },
  });

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
          <div className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-6 [&>*:nth-child(n+3)]:mt-2">
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

            <label className="contents [&>*]:mt-2">
              <span className={labelClassName}>From</span>
              <Controller
                control={control}
                name="from"
                render={({ field }) => {
                  const localPart = field.value?.split("@")[0] || "";
                  const domainSuffix = firstVerifiedEmailDomain?.slug
                    ? `@${firstVerifiedEmailDomain.slug}`
                    : "";
                  const isDisabled = isReadOnly || !firstVerifiedEmailDomain;

                  return (
                    <DisabledInputWrapper
                      tooltip={
                        isReadOnly ? (
                          statusMessages[campaign.status]
                        ) : !firstVerifiedEmailDomain ? (
                          <TooltipContent
                            title="You haven't configured an email domain yet. Please configure an email domain to enable campaign sending."
                            cta="Configure email domain"
                            href={`/${workspaceSlug}/settings/domains/email`}
                            target="_blank"
                          />
                        ) : undefined
                      }
                      disabled={isDisabled}
                      hideIcon={true}
                    >
                      <div
                        className={`flex items-center gap-1 ${inputClassName} ${isDisabled ? "cursor-not-allowed opacity-80" : ""}`}
                      >
                        <input
                          type="text"
                          placeholder="Address"
                          className="text-content-default placeholder:text-content-muted min-w-0 flex-1 border-0 bg-transparent p-0 focus:outline-none focus:ring-0 sm:text-sm"
                          disabled={isDisabled}
                          value={localPart}
                          onChange={(e) => {
                            const newLocalPart = e.target.value;
                            if (firstVerifiedEmailDomain?.slug) {
                              field.onChange(
                                `${newLocalPart}@${firstVerifiedEmailDomain.slug}`,
                              );
                            }
                          }}
                        />
                        <span className="text-content-muted shrink-0 text-sm">
                          {domainSuffix}
                        </span>
                      </div>
                    </DisabledInputWrapper>
                  );
                }}
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
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter a subject..."
                  className={cn(
                    inputClassName,
                    !isReadOnly && !showPreviewText && "pr-24",
                  )}
                  disabled={isReadOnly}
                  {...register("subject")}
                />
                {!isReadOnly && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <button
                      type="button"
                      onClick={() => setShowPreviewText(true)}
                      className={cn(
                        "text-content-subtle hover:text-content-default px-2 py-1 text-sm font-medium",
                        "transition-[transform,opacity] duration-150 ease-out",
                        showPreviewText && "translate-y-1 opacity-0",
                      )}
                      inert={showPreviewText}
                    >
                      Preview text
                    </button>
                  </div>
                )}
              </div>
            </DisabledInputWrapper>

            <ConditionalColumn show={showPreviewText}>
              <span className={cn(labelClassName, "flex h-8 items-center")}>
                Preview
              </span>
            </ConditionalColumn>
            <ConditionalColumn show={showPreviewText}>
              <input
                type="text"
                placeholder="Enter preview text..."
                className={inputClassName}
                disabled={isReadOnly}
                {...previewInputProps}
                ref={(e) => {
                  previewInputProps.ref(e);
                  previewInputRef.current = e;
                }}
              />
            </ConditionalColumn>

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

          {!isReadOnly && <DuplicateLogicWarning />}

          <div className="mt-6">
            <Controller
              control={control}
              name="bodyJson"
              render={({ field }) => (
                <RichTextProvider
                  ref={editorRef}
                  editorClassName="-m-2 min-h-[200px] p-2"
                  style="relaxed"
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
                >
                  <div className="flex flex-col gap-4">
                    <RichTextToolbar />
                    <RichTextArea />
                  </div>
                </RichTextProvider>
              )}
            />
          </div>

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

const ConditionalColumn = ({
  show,
  children,
}: PropsWithChildren<{ show: boolean }>) => {
  return (
    <motion.div
      initial={false}
      animate={{ height: show ? "auto" : 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "transition-[margin,opacity] duration-150",
        !show && "!mt-0 opacity-0",
      )}
      inert={!show}
    >
      {children}
    </motion.div>
  );
};
