"use client";

import { uploadEmailImageAction } from "@/lib/actions/partners/upload-email-image";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign, UpdateCampaignFormData } from "@/lib/types";
import { EMAIL_TEMPLATE_VARIABLES } from "@/lib/zod/schemas/campaigns";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ChevronRight, PaperPlane, RichTextArea, StatusBadge } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useCallback, useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { CAMPAIGN_STATUS_BADGES } from "../campaign-status-badges";
import { CampaignControls } from "./campaign-controls";
import { CampaignGroupsSelector } from "./campaign-groups-selector";
import { TransactionalCampaignLogic } from "./transactional-campaign-logic";

const inputClassName =
  "hover:border-border-subtle h-8 w-full rounded-md transition-colors duration-150 focus:border-black/75 border focus:ring-black/75 border-transparent px-1.5 py-0 text-sm text-content-default placeholder:text-content-muted hover:bg-neutral-100 hover:cursor-pointer";

const labelClassName = "text-sm font-medium text-content-subtle";

export function CampaignEditor({ campaign }: { campaign: Campaign }) {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const {
    makeRequest: saveDraftCampaign,
    isSubmitting: isSavingDraftCampaign,
  } = useApiMutation<Campaign>();

  const form = useForm<UpdateCampaignFormData>({
    defaultValues: {
      type: campaign?.type,
      name: campaign?.name,
      subject: campaign?.subject,
      body: campaign?.body,
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
    formState: { isDirty, dirtyFields },
  } = form;

  // Autosave draft campaign changes
  const handleSaveDraftCampaign = useCallback(
    useDebouncedCallback(async () => {
      if (campaign.status !== "draft" || isSavingDraftCampaign) {
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
          },
          onError: () => {
            toast.error("Failed to save the draft campaign.");
          },
        });
      }
    }, 1000),
    [getValues, dirtyFields, saveDraftCampaign, campaign.id, reset],
  );

  // Watch for form changes and trigger autosave
  useEffect(() => {
    const { unsubscribe } = watch(() => {
      if (isDirty) {
        handleSaveDraftCampaign();
      }
    });

    return () => unsubscribe();
  }, [watch, isDirty, saveDraftCampaign]);

  const { executeAsync: executeImageUpload } = useAction(
    uploadEmailImageAction,
  );

  const statusBadge = CAMPAIGN_STATUS_BADGES[campaign.status];

  return (
    <FormProvider {...form}>
      <PageContent
        title={
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <Link
                href={`/${workspaceSlug}/program/campaigns`}
                className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
              >
                <PaperPlane className="text-content-default size-4" />
              </Link>
              <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
            </div>

            <div className="flex items-center gap-1.5">
              <span>New Transactional</span>
              <StatusBadge variant={statusBadge.variant} icon={null}>
                {statusBadge.label}
              </StatusBadge>
            </div>
          </div>
        }
        controls={<CampaignControls campaign={campaign} />}
      >
        <PageWidthWrapper className="mb-8 max-w-[600px]">
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
                <label className="contents">
                  <span className={labelClassName}>Transactional</span>
                </label>
                <TransactionalCampaignLogic />
              </>
            )}
          </div>

          <div className="mt-6">
            <Controller
              control={control}
              name="body"
              render={({ field }) => (
                <RichTextArea
                  editorClassName="-m-2 min-h-[200px] p-2"
                  initialValue={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    handleSaveDraftCampaign();
                  }}
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

          <div className="border-border-subtle mt-4 w-full border-t pt-4 text-center text-xs font-medium text-neutral-300">
            End of email
          </div>
        </PageWidthWrapper>
      </PageContent>
    </FormProvider>
  );
}
