import { Button, LoadingSpinner, Modal } from "@dub/ui";
import slugify from "@sindresorhus/slugify";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { REWIND_STEPS } from "../../../../../../ui/partners/rewind/constants";

type ShareRewindModalInnerProps = {
  rewindId: string;
  step: string;
};

type ShareRewindModalProps = {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
} & ShareRewindModalInnerProps;

function ShareRewindModal(props: ShareRewindModalProps) {
  return (
    <Modal {...props} className="max-w-[500px] xl:max-w-[600px]">
      <ShareRewindModalInner {...props} />
    </Modal>
  );
}

function ShareRewindModalInner({ rewindId, step }: ShareRewindModalInnerProps) {
  const imageUrl = `/api/partner-profile/rewind/image?${new URLSearchParams({ rewindId, step }).toString()}`;

  const [isLoading, setIsLoading] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(imageUrl)
      .then((res) =>
        res.blob().then((blob) => {
          setBlob(blob);
          setIsLoading(false);
        }),
      )
      .catch(() => {
        toast.error("Failed to prepare rewind image for sharing");
      });
  }, [imageUrl]);

  return (
    <div className="flex flex-col gap-5 p-4 sm:px-6">
      <h3 className="text-lg font-medium">Share rewind</h3>

      <div className="border-border-subtle scrollbar-hide max-h-[calc(100dvh-200px)] overflow-y-auto rounded-xl border">
        <div className="relative aspect-[1084/994] w-full">
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner />
          </div>
          <img
            src={`/api/partner-profile/rewind/image?${new URLSearchParams({ rewindId, step }).toString()}`}
            alt="share rewind image"
            className="relative size-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          text="Copy"
          variant="secondary"
          disabled={isLoading}
          onClick={async () => {
            if (!blob) return;

            try {
              const clipboardItem = new ClipboardItem({
                [blob.type]: blob,
              });

              await navigator.clipboard.write([clipboardItem]);

              toast.success("Copied to clipboard");
            } catch (err) {
              console.error("Failed to copy image: ", err);
              toast.error("Failed to copy image to clipboard");
            }
          }}
          className="h-9 w-fit rounded-lg"
        />
        <Button
          text="Download"
          disabled={isLoading}
          onClick={() => {
            if (!blob) return;

            const blobUrl = URL.createObjectURL(blob);

            // Create an anchor element
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `rewind-${slugify(REWIND_STEPS.find((s) => s.id === step)?.label || "").toLowerCase()}.png`;

            // Append the link to the body (necessary for some browsers)
            document.body.appendChild(link);

            // Programmatically click the link to trigger the download
            link.click();

            // Clean up by removing the link and revoking the object URL
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }}
          className="h-9 w-fit rounded-lg"
        />
      </div>
    </div>
  );
}

export function useShareRewindModal(props: ShareRewindModalInnerProps) {
  const [showShareRewindModal, setShowShareRewindModal] = useState(false);

  const ShareRewindModalCallback = useCallback(() => {
    return (
      <ShareRewindModal
        showModal={showShareRewindModal}
        setShowModal={setShowShareRewindModal}
        {...props}
      />
    );
  }, [showShareRewindModal, setShowShareRewindModal, props]);

  return useMemo(
    () => ({
      setShowShareRewindModal,
      ShareRewindModal: ShareRewindModalCallback,
    }),
    [setShowShareRewindModal, ShareRewindModalCallback],
  );
}
