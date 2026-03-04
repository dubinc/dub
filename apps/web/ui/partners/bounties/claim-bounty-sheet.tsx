"use client";

import { createBountySubmissionAction } from "@/lib/actions/partners/create-bounty-submission";
import { uploadBountySubmissionFileAction } from "@/lib/actions/partners/upload-bounty-submission-file";
import {
  BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH,
  BOUNTY_MAX_SUBMISSION_FILES,
  BOUNTY_MAX_SUBMISSION_URLS,
} from "@/lib/bounty/constants";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerBountyProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { X } from "@/ui/shared/icons";
import {
  Button,
  FileUpload,
  Label,
  LoadingSpinner,
  Sheet,
  Trash,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { SocialContentUrlField } from "./bounty-social-content";
import {
  ClaimBountyProvider,
  useClaimBountyContext,
} from "./claim-bounty-context";
import {
  CreateBountySubmissionInput,
  useClaimBountyForm,
} from "./use-claim-bounty-form";

interface FileInput {
  id: string;
  file?: File;
  url?: string;
  uploading: boolean;
}

function ImagesField({
  bounty,
  onUploadingChange,
}: {
  bounty: PartnerBountyProps;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const { programEnrollment } = useProgramEnrollment();
  const { getValues, setValue } = useClaimBountyForm();

  const imageMax = bounty.submissionRequirements?.image?.max;
  const maxFiles = imageMax ?? BOUNTY_MAX_SUBMISSION_FILES;
  const formatRequirementText = (max?: number | null) =>
    max != null && max > 1 ? ` (1 required, max of ${max})` : " (1 required)";

  const [files, setFiles] = useState<FileInput[]>(() => {
    const existing = getValues("files") ?? [];
    return existing.map((f) => ({
      id: uuid(),
      url: f.url,
      uploading: false,
      file: undefined,
    }));
  });

  const { executeAsync: uploadFile } = useAction(
    uploadBountySubmissionFileAction,
  );

  const syncToForm = (updated: FileInput[]) => {
    const completed = updated
      .filter((f): f is FileInput & { url: string } => !f.uploading && !!f.url)
      .map((f) => ({
        url: f.url,
        fileName: f.file?.name ?? "File",
        size: f.file?.size ?? 0,
      }));
    setValue("files", completed);
  };

  const handleUpload = async (file: File) => {
    if (!programEnrollment) return;

    const newFile: FileInput = { id: uuid(), file, uploading: true };

    setFiles((prev) => {
      const updated = [...prev, newFile];
      onUploadingChange(true);
      return updated;
    });

    const result = await uploadFile({
      programId: programEnrollment.programId,
      bountyId: bounty.id,
    });

    if (!result?.data) {
      toast.error("Failed to get signed upload URL.");
      setFiles((prev) => {
        const updated = prev.filter((f) => f.id !== newFile.id);
        onUploadingChange(updated.some((f) => f.uploading));
        syncToForm(updated);
        return updated;
      });
      return;
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
      const res = await uploadResponse.json();
      toast.error(res.error?.message || "Failed to upload screenshot.");
      setFiles((prev) => {
        const updated = prev.filter((f) => f.id !== newFile.id);
        onUploadingChange(updated.some((f) => f.uploading));
        syncToForm(updated);
        return updated;
      });
      return;
    }

    toast.success(`${file.name} uploaded!`);

    setFiles((prev) => {
      const updated = prev.map((f) =>
        f.id === newFile.id
          ? { ...f, uploading: false, url: destinationUrl }
          : f,
      );
      onUploadingChange(updated.some((f) => f.uploading));
      syncToForm(updated);
      return updated;
    });
  };

  return (
    <div>
      <Label>Images{formatRequirementText(imageMax)}</Label>
      <div
        className={cn(
          "mt-2 flex h-12 items-center gap-2 transition-[height]",
          files.length === 0 && "h-[104px]",
        )}
      >
        {files.map((file, idx) => (
          <div
            key={file.id}
            className="border-border-subtle group relative flex aspect-square h-full items-center justify-center rounded-md border bg-white"
          >
            {file.uploading ? (
              <LoadingSpinner className="size-4" />
            ) : (
              <div className="relative size-full overflow-hidden rounded-md">
                <img
                  src={file.url}
                  alt={file.file?.name || `Bounty attachment ${idx + 1}`}
                />
              </div>
            )}
            <span className="sr-only">
              {file.file?.name || `File ${idx + 1}`}
            </span>
            <button
              type="button"
              className={cn(
                "absolute right-0 top-0 flex size-[1.125rem] -translate-y-1/2 translate-x-1/2 items-center justify-center",
                "rounded-full border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 active:scale-95",
                "scale-50 opacity-0 transition-[background-color,transform,opacity] group-hover:scale-100 group-hover:opacity-100",
              )}
              onClick={() => {
                setFiles((prev) => {
                  const updated = prev.filter((f) => f.id !== file.id);
                  syncToForm(updated);
                  return updated;
                });
              }}
            >
              <X className="size-2.5 text-neutral-400" />
            </button>
          </div>
        ))}

        <FileUpload
          accept="images"
          className={cn(
            "border-border-subtle h-full w-auto rounded-md border",
            files.length > 0 ? "aspect-square" : "aspect-[unset] w-full",
          )}
          iconClassName="size-5 shrink-0"
          variant="plain"
          content={
            files.length > 0 ? null : "SVG, JPG, PNG or WEBP\nMax size 5MB"
          }
          onChange={async ({ file }) => await handleUpload(file)}
          disabled={files.length >= maxFiles}
          maxFileSizeMB={5}
        />
      </div>
    </div>
  );
}

function UrlsField({ bounty }: { bounty: PartnerBountyProps }) {
  const { watch, setValue, getValues } = useClaimBountyForm();

  const bountyInfo = resolveBountyDetails(bounty);
  const socialPlatform = bountyInfo?.socialPlatform;

  const urlMax = bounty.submissionRequirements?.url?.max;
  const maxUrls = urlMax ?? BOUNTY_MAX_SUBMISSION_URLS;
  const formatRequirementText = (max?: number | null) =>
    max != null && max > 1 ? ` (1 required, max of ${max})` : " (1 required)";

  const firstDomain = bounty.submissionRequirements?.url?.domains?.[0];
  const placeholderUrl = firstDomain ? `https://${firstDomain}` : "https://";

  const formUrls = watch("urls") ?? [];
  const displayUrls = socialPlatform ? formUrls.slice(1) : formUrls;
  const rows = displayUrls.length > 0 ? displayUrls : [""];

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>URL{formatRequirementText(urlMax)}</Label>
        <span className="text-xs font-medium text-neutral-500">
          {formUrls.filter(Boolean).length} / {maxUrls}
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {rows.map((url, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="url"
              placeholder={placeholderUrl}
              value={url}
              onChange={(e) => {
                const prev = getValues("urls") ?? [];
                const idx = socialPlatform ? i + 1 : i;
                const next =
                  prev.length > idx
                    ? [...prev]
                    : [...prev, ...Array(idx - prev.length + 1).fill("")];
                next[idx] = e.target.value;
                setValue("urls", next);
              }}
              className="block h-10 w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
            <Button
              variant="outline"
              icon={<Trash className="size-4" />}
              className="w-10 shrink-0 bg-red-50 p-0 text-red-700 hover:bg-red-100"
              onClick={() => {
                const prev = getValues("urls") ?? [];
                const idx = socialPlatform ? i + 1 : i;
                setValue(
                  "urls",
                  prev.filter((_, j) => j !== idx),
                );
              }}
            />
          </div>
        ))}

        {formUrls.length < maxUrls && (
          <Button
            variant="secondary"
            text="Add URL"
            className="h-8 rounded-lg"
            onClick={() => {
              setValue("urls", [...(getValues("urls") ?? []), ""]);
            }}
          />
        )}

        {bounty.submissionRequirements?.url?.domains &&
          bounty.submissionRequirements.url.domains.length > 0 && (
            <p className="text-xs text-neutral-400">
              Allowed domains:{" "}
              {bounty.submissionRequirements.url.domains.join(", ")}
            </p>
          )}
      </div>
    </div>
  );
}

function DescriptionField() {
  const { watch, setValue } = useClaimBountyForm();
  const description = watch("description") ?? "";

  return (
    <div>
      <Label htmlFor="bounty-submission-description">
        Provide any additional details (optional)
      </Label>
      <ReactTextareaAutosize
        id="bounty-submission-description"
        className={cn(
          "mt-2 block w-full resize-none rounded-md focus:outline-none sm:text-sm",
          "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
        )}
        minRows={3}
        maxLength={BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH}
        value={description}
        onChange={(e) => {
          const value = e.target.value;
          if (value.length <= BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH) {
            setValue("description", value);
          }
        }}
      />
      <div className="mt-1 text-left">
        <span className="text-xs text-neutral-500">
          {description.length} / {BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH}
        </span>
      </div>
    </div>
  );
}

interface ClaimBountySheetProps {
  bounty: PartnerBountyProps;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  periodNumber?: number;
}

function ClaimBountySheetContent({
  bounty,
  setIsOpen,
  periodNumber,
}: Omit<ClaimBountySheetProps, "isOpen">) {
  const effectivePeriodNumber = periodNumber ?? 1;
  const submission =
    bounty.submissions?.find((s) => s.periodNumber === effectivePeriodNumber) ??
    null;
  const { programEnrollment } = useProgramEnrollment();
  const { socialContentVerifying, socialContentRequirementsMet } =
    useClaimBountyContext();

  const [isDraft, setIsDraft] = useState<boolean | null>(null);
  const [fileUploading, setFileUploading] = useState(false);

  const bountyInfo = resolveBountyDetails(bounty);
  const socialPlatform = bountyInfo?.socialPlatform;
  const isSocialMetricsBounty = bountyInfo?.hasSocialMetrics ?? false;

  const initialUrls = (() => {
    if (submission?.urls && submission.urls.length > 0) {
      return socialPlatform
        ? [submission.urls[0] ?? "", ...submission.urls.slice(1)]
        : [...submission.urls];
    }
    return [""];
  })();

  const claimForm = useForm<CreateBountySubmissionInput>({
    defaultValues: {
      urls: initialUrls,
      description: submission?.description ?? "",
      files:
        submission?.files?.map((f) => ({
          url: f.url,
          fileName: f.fileName ?? "File",
          size: f.size ?? 0,
        })) ?? [],
    },
  });

  const { executeAsync: createSubmission } = useAction(
    createBountySubmissionAction,
    {
      onSuccess: async ({ input }) => {
        const isDraftSave = !!input?.isDraft;
        toast.success(
          isDraftSave ? "Bounty progress saved." : "Bounty submitted.",
        );
        await mutatePrefix(
          `/api/partner-profile/programs/${programEnrollment?.program.slug}/bounties`,
        );
        setIsDraft(null);
        if (!isDraftSave) {
          setIsOpen(false);
        }
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError || "Failed to create submission. Please try again.",
        );
        setIsDraft(null);
      },
    },
  );

  const imageRequired = !!bounty.submissionRequirements?.image;
  const urlRequired = !!bounty.submissionRequirements?.url;

  const { confirmModal, setShowConfirmModal } = useConfirmModal({
    title: "Confirm submission",
    description: (
      <div className="space-y-2">
        <p>
          Are you sure you want to submit this bounty? Once submitted, you won't
          be able to make any further changes.
        </p>
        {!isSocialMetricsBounty && (
          <p>
            If you need to make changes later, you can save your progress as a
            draft instead.
          </p>
        )}
      </div>
    ),
    confirmText: "Confirm submission",
    onConfirm: () => handleSubmission({ isDraft: false }),
  });

  const handleSubmission = async ({ isDraft }: { isDraft: boolean }) => {
    if (!programEnrollment) {
      return;
    }

    setIsDraft(isDraft);

    const finalFiles = claimForm.getValues("files") ?? [];
    const formUrls = (claimForm.getValues("urls") ?? []).filter(Boolean);
    const description = claimForm.getValues("description") ?? "";

    try {
      if (!isDraft) {
        setShowConfirmModal(false);

        if (imageRequired && finalFiles.length === 0) {
          throw new Error("You must upload at least one image.");
        }

        if (socialPlatform && !formUrls[0]?.trim()) {
          throw new Error(`You must provide the ${socialPlatform.label} link.`);
        }

        if (urlRequired && formUrls.length === 0) {
          throw new Error("You must provide at least one URL.");
        }
      }

      await createSubmission({
        programId: programEnrollment.programId,
        bountyId: bounty.id,
        files: finalFiles,
        urls: formUrls,
        description,
        periodNumber: effectivePeriodNumber,
        ...(isDraft && { isDraft }),
      });
    } catch (error) {
      toast.error(
        error.message || "Failed to create submission. Please try again.",
      );
      setIsDraft(null);
    }
  };

  const isBusy =
    fileUploading ||
    isDraft === false ||
    socialContentVerifying ||
    (!!socialPlatform && !socialContentRequirementsMet);

  return (
    <>
      {confirmModal}
      <div className="relative flex size-full flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
          <Sheet.Title className="text-base font-semibold text-neutral-900">
            Submission
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>

        <FormProvider {...claimForm}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!programEnrollment) return;

              const submitter = (e.nativeEvent as SubmitEvent)
                .submitter as HTMLButtonElement;

              const isDraftSubmit =
                submitter?.name === "draft" && !isSocialMetricsBounty;

              if (isDraftSubmit) {
                await handleSubmission({ isDraft: true });
              } else {
                setShowConfirmModal(true);
              }
            }}
          >
            <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-5 p-5">
                {imageRequired && (
                  <ImagesField
                    bounty={bounty}
                    onUploadingChange={setFileUploading}
                  />
                )}
                {urlRequired && <UrlsField bounty={bounty} />}
                {socialPlatform && <SocialContentUrlField bounty={bounty} />}
                <DescriptionField />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-neutral-200 bg-white p-4">
              <Button
                variant="outline"
                text="Cancel"
                className="h-10 w-fit rounded-lg"
                type="button"
                onClick={() => setIsOpen(false)}
              />

              <div className="flex items-center gap-2">
                {!isSocialMetricsBounty && (
                  <Button
                    variant="secondary"
                    text="Save progress"
                    className="h-10 w-fit rounded-lg"
                    type="submit"
                    name="draft"
                    loading={isDraft === true}
                    disabled={isBusy}
                  />
                )}

                <Button
                  variant="primary"
                  text="Submit"
                  className="h-10 w-fit rounded-lg"
                  type="submit"
                  name="submit"
                  loading={isDraft === false}
                  disabled={isBusy}
                />
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    </>
  );
}

export function ClaimBountySheet({
  bounty,
  isOpen,
  setIsOpen,
  periodNumber,
}: ClaimBountySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <ClaimBountyProvider>
        <ClaimBountySheetContent
          bounty={bounty}
          setIsOpen={setIsOpen}
          periodNumber={periodNumber}
        />
      </ClaimBountyProvider>
    </Sheet>
  );
}

export function useClaimBountySheet(
  props: Omit<ClaimBountySheetProps, "isOpen" | "setIsOpen" | "periodNumber">,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePeriodNumber, setActivePeriodNumber] = useState<
    number | undefined
  >();

  return {
    claimBountySheet: (
      <ClaimBountySheet
        {...props}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        periodNumber={activePeriodNumber}
      />
    ),
    setShowClaimBountySheet: setIsOpen,
    setActivePeriodNumber,
  };
}
