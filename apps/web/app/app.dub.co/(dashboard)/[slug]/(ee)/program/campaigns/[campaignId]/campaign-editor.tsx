"use client";

import { uploadEmailImageAction } from "@/lib/actions/partners/upload-email-image";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign } from "@/lib/types";
import {
  EMAIL_TEMPLATE_VARIABLE_LABELS,
  updateCampaignSchema,
} from "@/lib/zod/schemas/campaigns";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { CampaignTypeSelector } from "@/ui/partners/campaigns/campaign-type-selector";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  ChevronRight,
  MenuItem,
  PaperPlane,
  Popover,
  RichTextArea,
  StatusBadge,
  Trash,
} from "@dub/ui";
import { Command } from "cmdk";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { CAMPAIGN_STATUS_BADGES } from "../campaign-status-badges";

type UpdateCampaignFormData = z.infer<typeof updateCampaignSchema>;

const useProgramEmailFormContext = () =>
  useFormContext<UpdateCampaignFormData>();

const inputClassName =
  "hover:border-border-subtle h-7 w-full rounded-md transition-colors duration-150 focus:border-black/75 border focus:ring-black/75 border-transparent px-1.5 py-0 text-sm text-content-default placeholder:text-content-muted hover:bg-neutral-100 hover:cursor-pointer";

const labelClassName = "text-sm font-medium text-content-muted";

export function CampaignEditor({ campaign }: { campaign: Campaign }) {
  const [openPopover, setOpenPopover] = useState(false);
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const { makeRequest, isSubmitting } = useApiMutation<Campaign>();

  const form = useForm<UpdateCampaignFormData>({
    defaultValues: {
      type: campaign?.type,
      name: campaign?.name,
      subject: campaign?.subject,
      body: campaign?.body,
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

  // Autosave function with debouncing
  const saveDraftCampaign = useCallback(
    useDebouncedCallback(async () => {
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

      console.log("changedFields", changedFields);

      // Only make request if there are changed fields
      if (Object.keys(changedFields).length > 0) {
        await makeRequest(`/api/campaigns/${campaign.id}`, {
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
    [getValues, dirtyFields, makeRequest, campaign.id, reset],
  );

  // Watch for form changes and trigger autosave
  useEffect(() => {
    const { unsubscribe } = watch(() => {
      if (isDirty) {
        saveDraftCampaign();
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
              <span>New Automation</span>
              <StatusBadge variant={statusBadge.variant} icon={null}>
                {statusBadge.label}
              </StatusBadge>
            </div>
          </div>
        }
        controls={
          <div className="flex items-center gap-2">
            <Button onClick={() => {}} text="Create" className="h-9" />
            <Popover
              openPopover={openPopover}
              setOpenPopover={setOpenPopover}
              align="end"
              content={
                <Command tabIndex={0} loop className="focus:outline-none">
                  <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[150px]">
                    <MenuItem
                      as={Command.Item}
                      icon={PaperPlane}
                      onSelect={() => {
                        //
                      }}
                    >
                      Send preview
                    </MenuItem>

                    <MenuItem
                      as={Command.Item}
                      icon={Trash}
                      variant="danger"
                      onSelect={() => {
                        //
                      }}
                    >
                      Delete
                    </MenuItem>
                  </Command.List>
                </Command>
              }
            >
              <Button
                onClick={() => setOpenPopover(!openPopover)}
                variant="secondary"
                className="h-8 w-auto px-1.5"
                icon={<ThreeDots className="size-5 text-neutral-500" />}
              />
            </Popover>
          </div>
        }
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

            <label className="contents">
              <span className={labelClassName}>To</span>
              <div />
            </label>

            <label className="contents">
              <span className={labelClassName}>Subject</span>
              <input
                type="text"
                placeholder="Enter a subject..."
                className={inputClassName}
                {...register("subject")}
              />
            </label>

            <label className="contents">
              <span className={labelClassName}>Type</span>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <CampaignTypeSelector
                    value={field.value!}
                    onChange={field.onChange}
                  />
                )}
              />
            </label>
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
                    saveDraftCampaign();
                  }}
                  variables={EMAIL_TEMPLATE_VARIABLE_LABELS}
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
