import { uploadEmailImageAction } from "@/lib/actions/partners/upload-email-image";
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
  StatusBadge,
  useKeyboardShortcut,
} from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { CAMPAIGN_STATUS_BADGES } from "../campaign-status-badges";
import { CampaignActionBar } from "./campaign-action-bar";
import { CampaignControls } from "./campaign-controls";
import { CampaignEvents } from "./campaign-events";
import { CampaignGroupsSelector } from "./campaign-groups-selector";
import { CampaignMetrics } from "./campaign-metrics";
import { TransactionalCampaignLogic } from "./transactional-campaign-logic";

const inputClassName =
  "hover:border-border-subtle h-8 w-full rounded-md transition-colors duration-150 focus:border-black/75 border focus:ring-black/75 border-transparent px-1.5 py-0 text-sm text-content-default placeholder:text-content-muted hover:bg-neutral-100 hover:cursor-pointer";

const labelClassName = "text-sm font-medium text-content-subtle";

export function CampaignEditor({ campaign }: { campaign: Campaign }) {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const { program } = useProgram();

  const {
    makeRequest: saveDraftCampaign,
    isSubmitting: isSavingDraftCampaign,
  } = useApiMutation<Campaign>();

  const form = useForm<UpdateCampaignFormData>({
    defaultValues: {
      name: campaign.name,
      subject: campaign.subject,
      bodyJson: campaign.bodyJson,
      groupIds: campaign.groups.map(({ id }) => id),
      triggerCondition: campaign.triggerCondition,
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

  const handleSaveCampaign = useCallback(
    async (isDraft: boolean = false, showSuccessToast: boolean = false) => {
      if (isSavingDraftCampaign) {
        return;
      }

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

        await saveDraftCampaign(`/api/campaigns/${campaign.id}`, {
          method: "PATCH",
          body: changedFields,
          onSuccess: () => {
            reset(allFormData, { keepValues: true });
            if (showSuccessToast) {
              toast.success("Campaign saved successfully!");
            }
          },
          onError: () => {
            toast.error(
              `Failed to save the ${isDraft ? "draft " : ""}campaign.`,
            );
          },
        });
      }
    },
    [
      isSavingDraftCampaign,
      getValues,
      dirtyFields,
      saveDraftCampaign,
      campaign.id,
      reset,
    ],
  );

  // Debounced auto-save for draft campaigns
  const handleSaveDraftCampaign = useDebouncedCallback(async () => {
    if (campaign.status !== CampaignStatus.draft) return;
    await handleSaveCampaign(true, false);
  }, 1000);

  // Manual save for non-draft campaigns
  const handleManualSave = useCallback(async () => {
    await handleSaveCampaign(false, true);
  }, [handleSaveCampaign]);

  // Watch for form changes and trigger autosave (only for draft campaigns)
  useEffect(() => {
    const { unsubscribe } = watch(() => {
      if (campaign.status !== CampaignStatus.draft) return;

      handleSaveDraftCampaign();
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
        handleManualSave();
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
                    New <span className="hidden sm:inline">transactional</span>{" "}
                    email
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      Transactional email
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
          campaign.status !== CampaignStatus.draft
            ? {
                title: "Metrics",
                content: (
                  <div className="flex grow flex-col gap-4">
                    <CampaignMetrics />
                    <CampaignEvents />
                  </div>
                ),
              }
            : undefined
        }
        individualScrolling
        contentWrapperClassName="flex flex-col"
      >
        {/* Content */}
        <PageWidthWrapper className="mb-8 mt-6 max-w-[600px]">
          <div className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-6 gap-y-2">
            <label className="contents">
              <span className={labelClassName}>Name</span>
              <input
                type="text"
                placeholder="Enter a name..."
                className={inputClassName}
                {...register("name")}
              />
            </label>

            <span className={labelClassName}>To</span>
            <Controller
              control={control}
              name="groupIds"
              render={({ field }) => (
                <CampaignGroupsSelector
                  selectedGroupIds={field.value ?? null}
                  setSelectedGroupIds={field.onChange}
                />
              )}
            />

            <label className="contents">
              <span className={labelClassName}>Subject</span>
              <input
                type="text"
                placeholder="Enter a subject..."
                className={inputClassName}
                {...register("subject")}
              />
            </label>

            {campaign.type === "transactional" && (
              <>
                <span className={labelClassName}>Logic</span>
                <TransactionalCampaignLogic />
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
                  variables={EMAIL_TEMPLATE_VARIABLES}
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
          onSave={handleManualSave}
          isSaving={isSavingDraftCampaign}
          onReset={() => {
            editorRef.current?.setContent(getValues("bodyJson"));
          }}
        />
      </PageContentWithSidePanel>
    </FormProvider>
  );
}
