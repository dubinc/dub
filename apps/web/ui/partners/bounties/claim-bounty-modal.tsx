import { createBountySubmissionAction } from "@/lib/actions/partners/create-bounty-submission";
import { uploadBountySubmissionFileAction } from "@/lib/actions/partners/upload-bounty-submission-file";
import {
  BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH,
  BOUNTY_MAX_SUBMISSION_FILES,
  BOUNTY_MAX_SUBMISSION_URLS,
  REJECT_BOUNTY_SUBMISSION_REASONS,
} from "@/lib/constants/bounties";
import { getBountyRewardDescription } from "@/lib/partners/get-bounty-reward-description";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerBountyProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { X } from "@/ui/shared/icons";
import { Markdown } from "@/ui/shared/markdown";
import {
  AnimatedSizeContainer,
  Button,
  Calendar6,
  FileUpload,
  Gift,
  LoadingSpinner,
  Modal,
  PROSE_STYLES,
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
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { BountyPerformance } from "./bounty-performance";
import { BountyThumbnailImage } from "./bounty-thumbnail-image";

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

interface Url {
  id: string;
  url: string;
}

function ClaimBountyModalContent({ bounty }: ClaimBountyModalProps) {
  const { submission } = bounty;

  const { programEnrollment } = useProgramEnrollment();

  const [success, setSuccess] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDraft, setIsDraft] = useState<boolean | null>(null);

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

  const [urls, setUrls] = useState<Url[]>(() => {
    if (submission?.urls && submission.urls.length > 0) {
      return submission.urls.map((url) => ({
        id: uuid(),
        url: url,
      }));
    }

    return [{ id: uuid(), url: "" }];
  });

  const { executeAsync: uploadFile } = useAction(
    uploadBountySubmissionFileAction,
  );

  const handleUpload = async (file: File) => {
    if (!programEnrollment) return;

    setFiles((prev) => [...prev, { id: uuid(), file, uploading: true }]);

    // TODO: Partners upload URL
    const result = await uploadFile({
      programId: programEnrollment.programId,
      bountyId: bounty.id,
    });

    if (!result?.data) throw new Error("Failed to get signed upload URL");

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

  const { executeAsync: createSubmission } = useAction(
    createBountySubmissionAction,
  );

  const imageRequired = bounty.submissionRequirements?.includes("image");
  const urlRequired = bounty.submissionRequirements?.includes("url");
  const fileUploading = files.some(({ uploading }) => uploading);

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
        <p>
          If you need to make changes later, you can save your progress as a
          draft instead.
        </p>
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
      .filter(({ url }) => url)
      .map(({ file, url }) => ({
        url: url!,
        fileName: file?.name || "File",
        size: file?.size || 0,
      }));

    const finalUrls = urls.map(({ url }) => url).filter(Boolean);

    try {
      // Check the submission requirements are met for non-draft submissions
      if (!isDraft) {
        setShowConfirmModal(false);
        if (imageRequired && finalFiles.length === 0) {
          throw new Error("You must upload at least one image.");
        }

        if (urlRequired && finalUrls.length === 0) {
          throw new Error("You must provide at least one URL.");
        }
      }

      const result = await createSubmission({
        programId: programEnrollment.programId,
        bountyId: bounty.id,
        files: finalFiles,
        urls: finalUrls,
        description,
        ...(isDraft && { isDraft }),
      });

      if (!result?.data?.success) {
        throw new Error(result?.serverError);
      }

      toast.success(isDraft ? "Bounty progress saved." : "Bounty submitted.");

      setSuccess(true);
      await mutatePrefix(
        `/api/partner-profile/programs/${programEnrollment.program.slug}/bounties`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create submission. Please try again.",
      );
    }
  };

  return (
    <>
      {confirmModal}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!programEnrollment) return;

          // Determine which button was clicked
          const submitter = (e.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement;

          const isDraft = submitter?.name === "draft";

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

                  {getBountyRewardDescription(bounty) && (
                    <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
                      <Gift className="size-3.5" />
                      <span>{getBountyRewardDescription(bounty)}</span>
                    </div>
                  )}

                  {submission ? (
                    <div className="mt-3 grid gap-2">
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

                {bounty.description && (
                  <div className="border-border-subtle flex flex-col gap-2 border-t p-6 text-sm max-sm:px-4">
                    <span className="text-content-emphasis font-semibold">
                      Details
                    </span>
                    <p className="text-content-subtle font-medium">
                      <Markdown className={cn("p-0", PROSE_STYLES.default)}>
                        {bounty.description}
                      </Markdown>
                    </p>
                  </div>
                )}

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
                    {/* Files */}
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
                            disabled={
                              files.length >= BOUNTY_MAX_SUBMISSION_FILES
                            }
                            maxFileSizeMB={5}
                          />
                        </div>
                      </div>
                    )}

                    {/* URLs */}
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
                            {urls.filter((u) => u.url).length} /{" "}
                            {BOUNTY_MAX_SUBMISSION_URLS}
                          </span>
                        </label>
                        <div className={cn("mt-2 flex flex-col gap-2")}>
                          {urls.map(({ id, url }, idx) => (
                            <div key={id} className="flex items-center gap-2">
                              <input
                                type="url"
                                placeholder="https://"
                                value={url}
                                onChange={(e) =>
                                  setUrls((prev) =>
                                    prev.map((u) =>
                                      u.id === id
                                        ? { ...u, url: e.target.value }
                                        : u,
                                    ),
                                  )
                                }
                                className="block h-10 w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                              />
                              {urls.length > 1 && (
                                <Button
                                  variant="outline"
                                  icon={<Trash className="size-4" />}
                                  className="w-10 shrink-0 bg-red-50 p-0 text-red-700 hover:bg-red-100"
                                  onClick={() =>
                                    setUrls((prev) =>
                                      prev.filter((s) => s.id !== id),
                                    )
                                  }
                                />
                              )}
                            </div>
                          ))}
                          {urls.length < BOUNTY_MAX_SUBMISSION_URLS && (
                            <Button
                              variant="secondary"
                              text="Add URL"
                              className="h-8 rounded-lg"
                              onClick={() =>
                                setUrls((prev) => [
                                  ...prev,
                                  { id: uuid(), url: "" },
                                ])
                              }
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <label
                        htmlFor="slug"
                        className="flex items-center space-x-2"
                      >
                        <h2 className="text-sm font-medium text-neutral-900">
                          How did you complete this bounty?
                        </h2>
                      </label>
                      <ReactTextareaAutosize
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
                    onClick={() => setIsFormOpen(false)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      text="Save progress"
                      className="h-9 rounded-lg px-3"
                      type="submit"
                      name="draft" // for submitter.name detection above
                      loading={isDraft === true}
                      disabled={fileUploading || isDraft === false}
                    />
                    <Button
                      variant="primary"
                      text="Submit"
                      className="h-9 rounded-lg px-3"
                      type="submit"
                      name="submit" // for submitter.name detection above
                      loading={isDraft === false}
                      disabled={fileUploading || isDraft === true}
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
                            )}. In the meantime, you can save your progress as a draft.`
                          : undefined
                      }
                    />
                  </div>
                </div>
              ) : (
                <Button
                  variant="primary"
                  text={submission ? "Continue submission" : "Claim bounty"}
                  className="w-full rounded-lg"
                  onClick={() => setIsFormOpen(true)}
                />
              )}
            </div>
          )}
      </form>
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
      <ClaimBountyModalContent {...rest} />
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
