"use client";

import { uploadEmailImageAction } from "@/lib/actions/partners/upload-email-image";
import useWorkspace from "@/lib/swr/use-workspace";
import { programEmailSchema } from "@/lib/zod/schemas/program-emails";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { EmailTypeSelector } from "@/ui/partners/emails/email-type-selector";
import { ChevronRight, PaperPlane, RichTextArea } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type ProgramEmailFormData = z.infer<typeof programEmailSchema>;

const useProgramEmailFormContext = () => useFormContext<ProgramEmailFormData>();

const labelClassName = "text-sm font-medium text-content-muted";

const inputClassName =
  "hover:border-border-subtle h-7 w-full rounded-md transition-colors duration-150 focus:border-black/75 border focus:ring-black/75 border-transparent px-1.5 py-0 text-sm text-content-default placeholder:text-content-muted";

export function ProgramCampaignPageClient() {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (campaignId !== "new") {
    return <div>WIP</div>;
  }

  // TODO: Load existing email data

  return <ProgramEmailForm />;
}

function ProgramEmailForm() {
  const searchParams = useSearchParams();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { executeAsync: executeImageUpload } = useAction(
    uploadEmailImageAction,
  );

  const form = useForm<ProgramEmailFormData>({
    defaultValues: {
      type:
        (["campaign", "automation"] as const).find(
          (t) => t === searchParams.get("type"),
        ) || "campaign",
      name: "New email",
    },
  });

  const { register, control, watch, handleSubmit } = form;
  const type = watch("type");

  return (
    <FormProvider {...form}>
      <PageContent
        title={
          <div className="flex items-center gap-1.5">
            <Link
              href={`/${workspaceSlug}/program/emails`}
              className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
            >
              <PaperPlane className="text-content-default size-4" />
            </Link>
            <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
            <span>{`New ${type === "campaign" ? "email" : type}`}</span>
          </div>
        }
        controls={<></>}
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
                  <EmailTypeSelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </label>

            <label className="contents">
              <span className={labelClassName}>Delivery</span>
              <div />
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
                  onChange={field.onChange}
                  variables={["PartnerName", "PartnerEmail"]}
                  uploadImage={async (file) => {
                    try {
                      const result = await executeImageUpload({
                        workspaceId: workspaceId!,
                      });

                      if (!result?.data)
                        throw new Error("Failed to get signed upload URL");

                      const { signedUrl, destinationUrl } = result.data;

                      const uploadResponse = await fetch(signedUrl, {
                        method: "PUT",
                        body: file,
                        headers: {
                          "Content-Type": file.type,
                          "Content-Length": file.size.toString(),
                        },
                      });

                      if (!uploadResponse.ok)
                        throw new Error("Failed to upload to signed URL");

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
