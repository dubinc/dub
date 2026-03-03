"use client";

import { createBountySubmissionAction } from "@/lib/actions/partners/create-bounty-submission";
import { uploadBountySubmissionFileAction } from "@/lib/actions/partners/upload-bounty-submission-file";
import { BOUNTY_SUBMISSION_STATUS_BADGES } from "@/lib/bounty/bounty-submission-status-badges";
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
  CopyButton,
  FileUpload,
  LoadingSpinner,
  Sheet,
  StatusBadge,
  Trash,
} from "@dub/ui";
import { cn, formatDate } from "@dub/utils";
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
import { CreateBountySubmissionInput } from "./use-claim-bounty-form";

interface FileInput {
  id: string;
  file?: File;
  url?: string;
  uploading: boolean;
}

type ClaimBountySheetProps = {
  bounty: PartnerBountyProps;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function ClaimBountySheetContent({
  bounty,
  setIsOpen,
}: Omit<ClaimBountySheetProps, "isOpen">) {
  const submission = bounty.submissions?.[0] ?? null;
  const { programEnrollment } = useProgramEnrollment();
  const { socialContentVerifying, socialContentRequirementsMet } =
    useClaimBountyContext();

  const [isDraft, setIsDraft] = useState<boolean | null>(null);

  const bountyInfo = resolveBountyDetails(bounty);
  const socialPlatform = bountyInfo?.socialPlatform;
  const isSocialMetricsBounty = bountyInfo?.hasSocialMetrics ?? false;

  const isViewMode = !!submission && submission.status !== "draft";

  const [description, setDescription] = useState(submission?.description || "");

  const [files, setFiles] = useState<FileInput[]>(() => {
    if (submission?.files && submission.files.length > 0) {
      return submission.files.map((file) => ({
        id: uuid(),
        url: file.url,
        uploading: false,
        file: undefined,
      }));
    }
    return [];
  });

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
    },
  });

  const { executeAsync: uploadFile } = useAction(
    uploadBountySubmissionFileAction,
  );

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

  const handleUpload = async (file: File) => {
    if (!programEnrollment) return;

    setFiles((prev) => [...prev, { id: uuid(), file, uploading: true }]);

    const result = await uploadFile({
      programId: programEnrollment.programId,
      bountyId: bounty.id,
    });

    if (!result?.data) {
      toast.error("Failed to get signed upload URL.");
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
      const result = await uploadResponse.json();
      toast.error(result.error.message || "Failed to upload screenshot.");
      return;
    }

    toast.success(`${file.name} uploaded!`);

    setFiles((prev) =>
      prev.map((f) =>
        f.file === file ? { ...f, uploading: false, url: destinationUrl } : f,
      ),
    );
  };

  const imageRequired = !!bounty.submissionRequirements?.image;
  const urlRequired = !!bounty.submissionRequirements?.url;
  const fileUploading = files.some(({ uploading }) => uploading);

  const imageMax = bounty.submissionRequirements?.image?.max;
  const maxFiles = imageMax ?? BOUNTY_MAX_SUBMISSION_FILES;
  const urlMax = bounty.submissionRequirements?.url?.max;
  const maxUrls = urlMax ?? BOUNTY_MAX_SUBMISSION_URLS;
  const formatRequirementText = (max?: number | null) =>
    max != null && max > 1 ? ` (1 required, max of ${max})` : " (1 required)";

  const placeholderUrl = (() => {
    const firstDomain = bounty.submissionRequirements?.url?.domains?.[0];
    if (!firstDomain) return "https://";
    return `https://${firstDomain}`;
  })();

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
    if (!programEnrollment) return;

    setIsDraft(isDraft);

    const finalFiles = files
      .filter((f): f is FileInput & { url: string } => !!f.url)
      .map(({ file, url }) => ({
        url,
        fileName: file?.name || "File",
        size: file?.size || 0,
      }));

    const formUrls = (claimForm.getValues("urls") ?? []).filter(Boolean);

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
        ...(isDraft && { isDraft }),
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create submission. Please try again.",
      );
      setIsDraft(null);
    }
  };

  const statusBadge = submission
    ? BOUNTY_SUBMISSION_STATUS_BADGES[submission.status]
    : null;

  const submittedDate = submission?.completedAt ?? submission?.createdAt;

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

        {isViewMode && submission ? (
          /* Read-only details view */
          <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="flex flex-col gap-5 p-5">
              {/* Details section */}
              <div className="flex flex-col gap-3">
                <h2 className="text-base font-semibold text-neutral-900">
                  Details
                </h2>
                <div className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3">
                  <span className="text-sm text-neutral-500">Status</span>
                  {statusBadge && (
                    <StatusBadge
                      variant={statusBadge.variant}
                      icon={statusBadge.icon}
                      className="w-fit rounded-lg py-1"
                    >
                      {statusBadge.label}
                    </StatusBadge>
                  )}
                  {submittedDate && (
                    <>
                      <span className="text-sm text-neutral-500">
                        Submitted
                      </span>
                      <span className="text-sm font-medium text-neutral-900">
                        {formatDate(submittedDate, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Images */}
              {Boolean(submission.files?.length) && (
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    Images
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {submission.files!.map((file, idx) => (
                      <a
                        key={idx}
                        className="border-border-subtle hover:border-border-default group relative flex size-14 items-center justify-center rounded-md border bg-white"
                        target="_blank"
                        href={file.url}
                        rel="noopener noreferrer"
                      >
                        <div className="relative size-full overflow-hidden rounded-md">
                          <img
                            src={file.url}
                            alt={file.fileName || `File ${idx + 1}`}
                            className="object-cover"
                          />
                        </div>
                        <span className="sr-only">
                          {file.fileName || `File ${idx + 1}`}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* URLs */}
              {Boolean(submission.urls?.length) && (
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    URLs
                  </h2>
                  <div className="mt-2 flex flex-col gap-2">
                    {submission.urls?.map((url, idx) => (
                      <div
                        className="relative"
                        key={`${submission.id}-${idx}-${url}`}
                      >
                        <div className="border-border-subtle block w-full rounded-lg border px-3 py-2 pl-10 pr-12">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block cursor-alias truncate text-sm font-normal text-neutral-800 decoration-dotted underline-offset-2 hover:underline"
                          >
                            {url}
                          </a>
                        </div>
                        <div className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                          <div className="flex size-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
                            {idx + 1}
                          </div>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                          <CopyButton
                            value={url}
                            onCopy={() => {
                              toast.success("URL copied to clipboard!");
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {submission.description && (
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Provide any additional details (optional)
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">
                    {submission.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Form view */
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
                    <div>
                      <h2 className="text-sm font-medium text-neutral-900">
                        Images{formatRequirementText(imageMax)}
                      </h2>
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
                                  alt={
                                    file.file?.name ||
                                    `Bounty attachment ${idx + 1}`
                                  }
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
                                setFiles((prev) =>
                                  prev.filter((s) => s.id !== file.id),
                                );
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
                            files.length > 0
                              ? "aspect-square"
                              : "aspect-[unset] w-full",
                          )}
                          iconClassName="size-5 shrink-0"
                          variant="plain"
                          content={
                            files.length > 0
                              ? null
                              : "SVG, JPG, PNG or WEBP\nMax size 5MB"
                          }
                          onChange={async ({ file }) =>
                            await handleUpload(file)
                          }
                          disabled={files.length >= maxFiles}
                          maxFileSizeMB={5}
                        />
                      </div>
                    </div>
                  )}

                  {urlRequired && (
                    <div>
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-neutral-900">
                          URL{formatRequirementText(urlMax)}
                        </h2>
                        <span className="text-xs font-medium text-neutral-500">
                          {
                            (claimForm.watch("urls") ?? []).filter(Boolean)
                              .length
                          }{" "}
                          / {maxUrls}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-col gap-2">
                        {(() => {
                          const formUrls = claimForm.watch("urls") ?? [];
                          const displayUrls = socialPlatform
                            ? formUrls.slice(1)
                            : formUrls;
                          const rows =
                            displayUrls.length > 0 ? displayUrls : [""];
                          return (
                            <>
                              {rows.map((url, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="url"
                                    placeholder={placeholderUrl}
                                    value={url}
                                    onChange={(e) => {
                                      const prev =
                                        claimForm.getValues("urls") ?? [];
                                      const idx = socialPlatform ? i + 1 : i;
                                      const next =
                                        prev.length > idx
                                          ? [...prev]
                                          : [
                                              ...prev,
                                              ...Array(
                                                idx - prev.length + 1,
                                              ).fill(""),
                                            ];
                                      next[idx] = e.target.value;
                                      claimForm.setValue("urls", next);
                                    }}
                                    className="block h-10 w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                                  />
                                  <Button
                                    variant="outline"
                                    icon={<Trash className="size-4" />}
                                    className="w-10 shrink-0 bg-red-50 p-0 text-red-700 hover:bg-red-100"
                                    onClick={() => {
                                      const prev =
                                        claimForm.getValues("urls") ?? [];
                                      const idx = socialPlatform ? i + 1 : i;
                                      claimForm.setValue(
                                        "urls",
                                        prev.filter((_, j) => j !== idx),
                                      );
                                    }}
                                  />
                                </div>
                              ))}
                              {(claimForm.watch("urls") ?? []).length <
                                maxUrls && (
                                <Button
                                  variant="secondary"
                                  text="Add URL"
                                  className="h-8 rounded-lg"
                                  onClick={() => {
                                    claimForm.setValue("urls", [
                                      ...(claimForm.getValues("urls") ?? []),
                                      "",
                                    ]);
                                  }}
                                />
                              )}
                            </>
                          );
                        })()}
                        {bounty.submissionRequirements?.url?.domains &&
                          bounty.submissionRequirements.url.domains.length >
                            0 && (
                            <p className="text-xs text-neutral-400">
                              Allowed domains:{" "}
                              {bounty.submissionRequirements.url.domains.join(
                                ", ",
                              )}
                            </p>
                          )}
                      </div>
                    </div>
                  )}

                  {socialPlatform && <SocialContentUrlField bounty={bounty} />}

                  <div>
                    <label
                      htmlFor="bounty-submission-description"
                      className="text-sm font-medium text-neutral-900"
                    >
                      Provide any additional details (optional)
                    </label>
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
                        if (
                          value.length <=
                          BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH
                        ) {
                          setDescription(value);
                        }
                      }}
                    />
                    <div className="mt-1 text-left">
                      <span className="text-xs text-neutral-500">
                        {description.length} /{" "}
                        {BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky footer */}
              {bounty.type !== "performance" && (
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-200 bg-white p-4">
                  {!isSocialMetricsBounty && (
                    <Button
                      variant="secondary"
                      text="Save progress"
                      className="h-9 rounded-lg px-3"
                      type="submit"
                      name="draft"
                      loading={isDraft === true}
                      disabled={
                        fileUploading ||
                        isDraft === false ||
                        socialContentVerifying ||
                        (!!socialPlatform && !socialContentRequirementsMet)
                      }
                    />
                  )}
                  <Button
                    variant="primary"
                    text="Submit"
                    className="h-9 rounded-lg px-3"
                    type="submit"
                    name="submit"
                    loading={isDraft === false}
                    disabled={
                      fileUploading ||
                      isDraft === true ||
                      socialContentVerifying ||
                      (!!socialPlatform && !socialContentRequirementsMet)
                    }
                  />
                </div>
              )}
            </form>
          </FormProvider>
        )}
      </div>
    </>
  );
}

export function ClaimBountySheet({
  bounty,
  isOpen,
  setIsOpen,
}: ClaimBountySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <ClaimBountyProvider>
        <ClaimBountySheetContent bounty={bounty} setIsOpen={setIsOpen} />
      </ClaimBountyProvider>
    </Sheet>
  );
}

export function useClaimBountySheet(
  props: Omit<ClaimBountySheetProps, "isOpen" | "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    claimBountySheet: (
      <ClaimBountySheet {...props} isOpen={isOpen} setIsOpen={setIsOpen} />
    ),
    setShowClaimBountySheet: setIsOpen,
  };
}
