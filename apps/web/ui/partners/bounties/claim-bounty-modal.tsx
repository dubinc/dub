import { createBountySubmissionAction } from "@/lib/actions/partners/create-bounty-submission";
import { uploadBountySubmissionFileAction } from "@/lib/actions/partners/upload-bounty-submission-file";
import {
  BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH,
  BOUNTY_MAX_SUBMISSION_FILES,
  BOUNTY_MAX_SUBMISSION_URLS,
  REJECT_BOUNTY_SUBMISSION_REASONS,
} from "@/lib/bounty/constants";
import { getBountyInfo } from "@/lib/bounty/utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerBountyProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  Calendar6,
  FileUpload,
  LoadingSpinner,
  Modal,
  StatusBadge,
  Trash,
  buttonVariants,
  useRouterStuff,
} from "@dub/ui";
import { cn, formatDate, getPrettyUrl } from "@dub/utils";
import { isBefore } from "date-fns";
import Linkify from "linkify-react";
import { motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { BountyDescription } from "./bounty-description";
import { BountyPerformance } from "./bounty-performance";
import { BountyRewardDescription } from "./bounty-reward-description";
import {
  SocialAccountNotVerifiedWarning,
  SocialContentUrlField,
} from "./bounty-social-content";
import { BountyThumbnailImage } from "./bounty-thumbnail-image";
import {
  ClaimBountyProvider,
  useClaimBountyContext,
} from "./claim-bounty-context";
import { CreateBountySubmissionInput } from "./use-claim-bounty-form";

type ClaimBountyModalProps = {
  setShowModal: Dispatch<SetStateAction<boolean>>;
  bounty: PartnerBountyProps;
};

interface FileInput {
  id: string;
  file?: File;
  url?: string;
  uploading: boolean;
}

function ClaimBountyModalContent({ bounty }: ClaimBountyModalProps) {
  const { submission } = bounty;
  const { programEnrollment } = useProgramEnrollment();
  const { platformsVerified } = usePartnerProfile();

  const [success, setSuccess] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDraft, setIsDraft] = useState<boolean | null>(null);
  const { socialContentVerifying, socialContentRequirementsMet } =
    useClaimBountyContext();

  const bountyInfo = getBountyInfo(bounty);
  const socialPlatform = bountyInfo?.socialPlatform;
  const isSocialMetricsBounty = bountyInfo?.hasSocialMetrics ?? false;

  // Initialize form state with existing draft submission data
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
      onSuccess: async () => {
        toast.success(isDraft ? "Bounty progress saved." : "Bounty submitted.");
        setSuccess(true);
        await mutatePrefix(
          `/api/partner-profile/programs/${programEnrollment?.program.slug}/bounties`,
        );
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError || "Failed to create submission. Please try again.",
        );
        setIsDraft(null);
      },
    },
  );

  // Handle file upload
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

  // Get max values from bounty submission requirements, fallback to constants
  const maxFiles =
    bounty.submissionRequirements?.image?.max ?? BOUNTY_MAX_SUBMISSION_FILES;
  const maxUrls =
    bounty.submissionRequirements?.url?.max ?? BOUNTY_MAX_SUBMISSION_URLS;

  // Get placeholder URL from domain if available
  const placeholderUrl = (() => {
    const firstDomain = bounty.submissionRequirements?.url?.domains?.[0];
    if (!firstDomain) return "https://";
    return `https://${firstDomain}`;
  })();

  const hasSubmissionsOpen = bounty.submissionsOpenAt
    ? isBefore(bounty.submissionsOpenAt, new Date())
    : true;

  // Confirmation modal for final submission
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

  // Function to handle the actual submission
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
      setIsDraft(null); // reset submit state on error
    }
  };

  return (
    <>
      {confirmModal}
      <FormProvider {...claimForm}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!programEnrollment) return;

            // Determine which button was clicked
            const submitter = (e.nativeEvent as SubmitEvent)
              .submitter as HTMLButtonElement;

            const isDraft =
              submitter?.name === "draft" && !isSocialMetricsBounty;

            if (isDraft) {
              // Handle draft save directly
              await handleSubmission({ isDraft: true });
            } else {
              // Show confirmation modal for final submission
              setShowConfirmModal(true);
            }
          }}
        >
          <div className="scrollbar-hide max-h-[calc(100dvh-150px)] overflow-y-auto">
            <div className="flex h-[132px] items-center justify-center bg-neutral-100 py-3">
              <div className="relative size-full">
                <BountyThumbnailImage bounty={bounty} />
              </div>
            </div>

            <AnimatedSizeContainer
              height={isFormOpen}
              transition={{ duration: 0.15, ease: "easeInOut" }}
            >
              {success ? (
                <div className="mx-auto flex max-w-sm flex-col items-center gap-1 p-6 text-center max-sm:px-4">
                  {isDraft ? (
                    <>
                      <span className="text-content-emphasis text-base font-semibold">
                        Progress saved successfully.
                      </span>
                      <p className="text-content-subtle text-balance text-sm font-medium">
                        You can continue working on your submission later.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="text-content-emphasis text-base font-semibold">
                        Congratulations! You've successfully submitted your
                        bounty.
                      </span>
                      <p className="text-content-subtle text-balance text-sm font-medium">
                        We'll let you know when your bounty has been reviewed.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1 p-6 max-sm:px-4">
                    <span className="text-content-emphasis truncate text-sm font-semibold">
                      {bounty.name}
                    </span>

                    <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
                      <Calendar6 className="size-3.5" />
                      <span>
                        {bounty.endsAt ? (
                          <>
                            Ends {formatDate(bounty.endsAt, { month: "short" })}
                          </>
                        ) : (
                          "No end date"
                        )}
                      </span>
                    </div>

                    <BountyRewardDescription
                      bounty={bounty}
                      className="font-medium"
                    />

                    {submission ? (
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2">
                          {submission.status === "approved" && (
                            <Link
                              href={`/programs/${programEnrollment?.program.slug}/earnings?type=custom`}
                              target="_blank"
                              className={cn(
                                buttonVariants({ variant: "primary" }),
                                "flex h-7 w-fit items-center whitespace-nowrap rounded-lg border px-2.5 text-sm",
                              )}
                            >
                              View earnings
                            </Link>
                          )}
                          {submission.status !== "draft" && (
                            <StatusBadge
                              className="rounded-lg py-1.5"
                              variant={
                                submission.status === "submitted"
                                  ? "new"
                                  : submission.status === "approved"
                                    ? "success"
                                    : "error"
                              }
                              icon={
                                submission.status === "approved"
                                  ? undefined
                                  : null
                              }
                            >
                              {submission.status === "submitted" ? (
                                <>
                                  Pending Review |{" "}
                                  {bounty.type === "performance"
                                    ? "Completed"
                                    : "Submitted"}{" "}
                                  {submission.completedAt &&
                                    formatDate(submission.completedAt, {
                                      month: "short",
                                    })}
                                </>
                              ) : submission.status === "approved" ? (
                                <>
                                  Confirmed{" "}
                                  {submission.reviewedAt &&
                                    formatDate(submission.reviewedAt, {
                                      month: "short",
                                    })}
                                </>
                              ) : (
                                "Rejected"
                              )}
                            </StatusBadge>
                          )}
                        </div>

                        {/* Rejection details for rejected submissions */}
                        {submission.status === "rejected" && (
                          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
                            <div className="flex gap-1">
                              <span className="text-sm font-medium text-red-900">
                                Rejection reason:
                              </span>
                              <span className="text-sm text-red-800">
                                {submission.rejectionReason &&
                                  REJECT_BOUNTY_SUBMISSION_REASONS[
                                    submission.rejectionReason as keyof typeof REJECT_BOUNTY_SUBMISSION_REASONS
                                  ]}
                              </span>
                            </div>
                            {submission.rejectionNote && (
                              <div className="mt-1">
                                <span className="text-sm font-medium text-red-900">
                                  Note:
                                </span>
                                <Linkify
                                  as="p"
                                  options={{
                                    target: "_blank",
                                    rel: "noopener noreferrer nofollow",
                                    format: (href) => getPrettyUrl(href),
                                    className:
                                      "underline underline-offset-4 text-red-400 hover:text-red-700",
                                  }}
                                  className="mt-1 whitespace-pre-wrap text-sm text-red-800"
                                >
                                  {submission.rejectionNote}
                                </Linkify>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      bounty.type === "performance" && (
                        <div className="mt-5">
                          <BountyPerformance bounty={bounty} />
                        </div>
                      )
                    )}
                  </div>

                  <div className="border-border-subtle flex flex-col space-y-3 border-t p-6 text-sm max-sm:px-4">
                    <BountyDescription bounty={bounty} />
                  </div>

                  {/* Form */}
                  <motion.div
                    initial={false}
                    animate={{ height: isFormOpen ? "auto" : 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "overflow-hidden transition-opacity",
                      !isFormOpen && "opacity-0",
                    )}
                  >
                    <div className="border-border-subtle flex flex-col gap-5 border-t p-6 max-sm:px-4">
                      {imageRequired && (
                        <div>
                          <label
                            htmlFor="slug"
                            className="flex items-center space-x-2"
                          >
                            <h2 className="text-sm font-medium text-neutral-900">
                              Files
                              {imageRequired && " (at least 1 required)"}
                            </h2>
                          </label>
                          <div
                            className={cn(
                              "mt-2 flex h-12 items-center gap-2 transition-[height]",
                              files.length === 0 && "h-24",
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
                                    <img src={file.url} alt="object-cover" />
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
                                  : "JPG or PNG, max size of 5MB"
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
                          <label
                            htmlFor="slug"
                            className="flex items-center justify-between"
                          >
                            <h2 className="text-sm font-medium text-neutral-900">
                              URLs
                              {urlRequired && " (at least 1 required)"}
                            </h2>
                            <span className="text-xs font-medium text-neutral-500">
                              {
                                (claimForm.watch("urls") ?? []).filter(Boolean)
                                  .length
                              }{" "}
                              / {maxUrls}
                            </span>
                          </label>
                          <div className={cn("mt-2 flex flex-col gap-2")}>
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
                                          const idx = socialPlatform
                                            ? i + 1
                                            : i;
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
                                      {rows.length > 1 && (
                                        <Button
                                          variant="outline"
                                          icon={<Trash className="size-4" />}
                                          className="w-10 shrink-0 bg-red-50 p-0 text-red-700 hover:bg-red-100"
                                          onClick={() => {
                                            const prev =
                                              claimForm.getValues("urls") ?? [];
                                            const idx = socialPlatform
                                              ? i + 1
                                              : i;
                                            claimForm.setValue(
                                              "urls",
                                              prev.filter((_, j) => j !== idx),
                                            );
                                          }}
                                        />
                                      )}
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
                                          ...(claimForm.getValues("urls") ??
                                            []),
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

                      {socialPlatform && (
                        <SocialContentUrlField bounty={bounty} />
                      )}

                      <div>
                        <label
                          htmlFor="bounty-submission-description"
                          className="flex items-center space-x-2"
                        >
                          <span className="text-sm font-medium text-neutral-900">
                            Provide any additional details (optional)
                          </span>
                        </label>
                        <ReactTextareaAutosize
                          id="bounty-submission-description"
                          className={cn(
                            "mt-2 block w-full resize-none rounded-md focus:outline-none sm:text-sm",
                            "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                          )}
                          minRows={2}
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
                            {BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH -
                              description.length}{" "}
                            / {BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatedSizeContainer>
          </div>

          {/* Action buttons - outside scrollable area */}
          {bounty.type !== "performance" &&
            (!submission || submission.status === "draft") &&
            !success && (
              <div className="border-t border-neutral-200 bg-white p-4">
                {isFormOpen ? (
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      text="Cancel"
                      className="h-9 w-fit rounded-lg px-3"
                      onClick={() => {
                        claimForm.reset({ urls: initialUrls });
                        setDescription(submission?.description || "");
                        setFiles(
                          submission?.files && submission.files.length > 0
                            ? submission.files.map((file) => ({
                                id: uuid(),
                                url: file.url,
                                uploading: false,
                                file: undefined,
                              }))
                            : [],
                        );
                        setIsFormOpen(false);
                      }}
                    />
                    <div className="flex gap-2">
                      {!isSocialMetricsBounty && (
                        <Button
                          variant="secondary"
                          text="Save progress"
                          className="h-9 rounded-lg px-3"
                          type="submit"
                          name="draft" // for submitter.name detection above
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
                        name="submit" // for submitter.name detection above
                        loading={isDraft === false}
                        disabled={
                          fileUploading ||
                          isDraft === true ||
                          socialContentVerifying ||
                          (!!socialPlatform && !socialContentRequirementsMet)
                        }
                        disabledTooltip={
                          !hasSubmissionsOpen
                            ? `Submissions are not open yet. They will open on ${formatDate(
                                bounty.submissionsOpenAt!,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  timeZone: "UTC",
                                },
                              )}.${isSocialMetricsBounty ? "" : " In the meantime, you can save your progress as a draft."}`
                            : socialPlatform && !socialContentRequirementsMet
                              ? "Post must be from your verified account and after the bounty start date."
                              : undefined
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {socialPlatform &&
                    !platformsVerified?.[socialPlatform.value] ? (
                      <SocialAccountNotVerifiedWarning bounty={bounty} />
                    ) : (
                      <Button
                        variant="primary"
                        text={
                          submission ? "Continue submission" : "Claim bounty"
                        }
                        className="w-full rounded-lg"
                        onClick={() => setIsFormOpen(true)}
                      />
                    )}
                  </>
                )}
              </div>
            )}
        </form>
      </FormProvider>
    </>
  );
}

export function ClaimBountyModal({
  showModal,
  ...rest
}: ClaimBountyModalProps & {
  showModal: boolean;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <Modal
      showModal={showModal}
      setShowModal={rest.setShowModal}
      onClose={() => queryParams({ del: "bountyId", scroll: false })}
    >
      <ClaimBountyProvider>
        <ClaimBountyModalContent {...rest} />
      </ClaimBountyProvider>
    </Modal>
  );
}

export function useClaimBountyModal(
  props: Omit<ClaimBountyModalProps, "setShowModal">,
) {
  const [showModal, setShowModal] = useState(false);

  return {
    claimBountyModal: (
      <ClaimBountyModal
        setShowModal={setShowModal}
        showModal={showModal}
        {...props}
      />
    ),
    setShowClaimBountyModal: setShowModal,
  };
}
