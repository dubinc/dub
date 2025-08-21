import { uploadBountySubmissionFileAction } from "@/lib/actions/partners/upload-bounty-submission-file";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { BountyProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
  Button,
  Calendar6,
  FileUpload,
  LoadingSpinner,
  Modal,
  useRouterStuff,
} from "@dub/ui";
import { cn, formatDate } from "@dub/utils";
import { motion } from "framer-motion";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { BountyThumbnailImage } from "./bounty-thumbnail-image";

type ClaimBountyModalProps = {
  setShowModal: Dispatch<SetStateAction<boolean>>;
  bounty: BountyProps;
};

function ClaimBountyModalContent({
  setShowModal,
  bounty,
}: ClaimBountyModalProps) {
  const { programEnrollment } = useProgramEnrollment();

  const [isFormOpen, setIsFormOpen] = useState(false);

  const [files, setFiles] = useState<
    {
      id: string;
      file?: File;
      url?: string;
      uploading: boolean;
    }[]
  >([]);

  const { executeAsync } = useAction(uploadBountySubmissionFileAction);

  const handleUpload = async (file: File) => {
    if (!programEnrollment) return;

    setFiles((prev) => [...prev, { id: uuid(), file, uploading: true }]);

    // TODO: Partners upload URL
    const result = await executeAsync({
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

  return (
    <div className="scrollbar-hide max-h-[calc(100dvh-50px)] overflow-y-auto">
      <div className="flex h-[132px] items-center justify-center bg-neutral-100 py-3">
        <div className="relative size-full">
          <BountyThumbnailImage bounty={bounty} />
        </div>
      </div>

      <div className="flex flex-col gap-1 p-6 max-sm:px-4">
        <span className="text-content-emphasis truncate text-sm font-semibold">
          {bounty.name}
        </span>

        <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
          <Calendar6 className="size-3.5" />
          <span>
            {bounty.endsAt ? (
              <>
                Ends
                {formatDate(bounty.endsAt, { month: "short" })}
              </>
            ) : (
              "No end date"
            )}
          </span>
        </div>
      </div>

      {bounty.description && (
        <div className="border-border-subtle flex flex-col gap-2 border-t p-6 text-sm max-sm:px-4">
          <span className="text-content-emphasis font-semibold">Details</span>
          <p className="text-content-subtle font-medium">
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
        <div className="border-border-subtle border-t p-6 max-sm:px-4">
          <div>
            <label htmlFor="slug" className="flex items-center space-x-2">
              <h2 className="text-sm font-medium text-neutral-900">Files</h2>
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
                      setFiles((prev) => prev.filter((s) => s.id !== file.id));
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
                  files.length > 0 ? null : "JPG or PNG, max size of 5MB"
                }
                onChange={async ({ file }) => await handleUpload(file)}
                disabled={files.length >= 4}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
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
              isFormOpen ? () => toast.info("WIP") : () => setIsFormOpen(true)
            }
          />
        </div>
      </div>
    </div>
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
