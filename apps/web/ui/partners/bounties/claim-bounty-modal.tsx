import { createBountySubmissionAction } from "@/lib/actions/partners/create-bounty-submission";
import { uploadBountySubmissionFileAction } from "@/lib/actions/partners/upload-bounty-submission-file";
import { getBountyRewardDescription } from "@/lib/partners/get-bounty-reward-description";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { BountySubmissionProps, PartnerBountyProps } from "@/lib/types";
import {
  MAX_SUBMISSION_FILES,
  MAX_SUBMISSION_URLS,
  REJECT_BOUNTY_SUBMISSION_REASONS,
} from "@/lib/zod/schemas/bounties";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  Calendar6,
  FileUpload,
  Gift,
  LoadingSpinner,
  Modal,
  StatusBadge,
  Trash,
  buttonVariants,
  useEnterSubmit,
  useRouterStuff,
} from "@dub/ui";
import { cn, formatDate, getPrettyUrl } from "@dub/utils";
import { motion } from "framer-motion";
import Linkify from "linkify-react";
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
  submission?: BountySubmissionProps["submission"];
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

function ClaimBountyModalContent({
  bounty,
  submission,
}: ClaimBountyModalProps) {
  const { programEnrollment } = useProgramEnrollment();

  const { handleKeyDown } = useEnterSubmit();
  const [success, setSuccess] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileInput[]>([]);
  const [urls, setUrls] = useState<Url[]>([{ id: uuid(), url: "" }]);

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

  const { executeAsync: createSubmission, isPending } = useAction(
    createBountySubmissionAction,
  );

  const imageRequired = bounty.submissionRequirements?.includes("image");
  const urlRequired = bounty.submissionRequirements?.includes("url");
  const fileUploading = files.some(({ uploading }) => uploading);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!programEnrollment) return;

        try {
          const result = await createSubmission({
            programId: programEnrollment.programId,
            bountyId: bounty.id,
            files: files
              .filter(({ file, url }) => file && url)
              .map(({ file, url }) => ({
                url: url!,
                fileName: file?.name || "File",
                size: file?.size || 0,
              })),
            urls: urls.map(({ url }) => url).filter(Boolean),
            description,
          });

          if (!result?.data?.success)
            throw new Error("Failed to create submission");

          mutatePrefix(
            `/api/partner-profile/programs/${programEnrollment.program.slug}/bounties`,
          );
          setSuccess(true);
        } catch (e) {
          toast.error("Failed to create submission. Please try again.");
        }
      }}
      className="scrollbar-hide max-h-[calc(100dvh-50px)] overflow-y-auto"
    >
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
            <span className="text-content-emphasis text-base font-semibold">
              Congratulations! You've successfully submitted your bounty.
            </span>
            <p className="text-content-subtle text-sm font-medium">
              We'll let you know when your bounty has been reviewed.
            </p>
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
                    <>Ends {formatDate(bounty.endsAt, { month: "short" })}</>
                  ) : (
                    "No end date"
                  )}
                </span>
              </div>

              <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
                <Gift className="size-3.5 shrink-0" />
                <span className="truncate">
                  {getBountyRewardDescription(bounty)}
                </span>
              </div>

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
                    <StatusBadge
                      className="rounded-lg py-1.5"
                      variant={
                        submission.status === "pending"
                          ? "pending"
                          : submission.status === "approved"
                            ? "success"
                            : "error"
                      }
                      icon={submission.status === "approved" ? undefined : null}
                    >
                      {submission.status === "pending" ? (
                        `Submitted ${formatDate(submission.createdAt, { month: "short" })}`
                      ) : submission.status === "approved" ? (
                        bounty.type === "performance" ? (
                          <>
                            Completed{" "}
                            {formatDate(submission.createdAt, {
                              month: "short",
                            })}
                          </>
                        ) : (
                          <>
                            Confirmed{" "}
                            {submission.reviewedAt &&
                              formatDate(submission.reviewedAt, {
                                month: "short",
                              })}
                          </>
                        )
                      ) : (
                        "Rejected"
                      )}
                    </StatusBadge>
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
                <p className="text-content-subtle whitespace-pre-wrap font-medium">
                  {bounty.description}
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
                        onChange={async ({ file }) => await handleUpload(file)}
                        disabled={files.length >= MAX_SUBMISSION_FILES}
                      />
                    </div>
                  </div>
                )}

                {/* URLs */}
                {urlRequired && (
                  <div>
                    <label
                      htmlFor="slug"
                      className="flex items-center space-x-2"
                    >
                      <h2 className="text-sm font-medium text-neutral-900">
                        URLs
                        {urlRequired && " (at least 1 required)"}
                      </h2>
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
                      {urls.length < MAX_SUBMISSION_URLS && (
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
                  <label htmlFor="slug" className="flex items-center space-x-2">
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
                    onKeyDown={handleKeyDown}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </motion.div>

            {/* Action buttons */}
            {bounty.type !== "performance" && !submission && (
              <div className="border-border-subtle border-t p-5">
                <div
                  className={cn(
                    "flex items-center transition-all",
                    isFormOpen ? "gap-4" : "gap-0",
                  )}
                >
                  <div
                    className={cn(
                      "shrink-0 overflow-hidden transition-[width]",
                      isFormOpen ? "w-[calc(50%-1rem)]" : "w-0",
                    )}
                  >
                    <Button
                      variant="secondary"
                      text="Cancel"
                      className="rounded-lg"
                      onClick={() => setIsFormOpen(false)}
                    />
                  </div>
                  <Button
                    variant="primary"
                    text={isFormOpen ? "Submit proof" : "Claim bounty"}
                    className="grow rounded-lg"
                    onClick={
                      isFormOpen
                        ? undefined
                        : // Delay open to prevent also submitting the form
                          () => setTimeout(() => setIsFormOpen(true), 100)
                    }
                    loading={isPending}
                    disabled={
                      isFormOpen &&
                      ((imageRequired && !files.length) ||
                        (urlRequired &&
                          !urls.filter(({ url }) => url).length) ||
                        fileUploading)
                    }
                  />
                </div>
              </div>
            )}
          </>
        )}
      </AnimatedSizeContainer>
    </form>
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
