"use client";

import { IntervalOptions } from "@/lib/analytics/types";
import { Button, LoadingSpinner, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { X } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const BACKGROUND_OPTIONS = [
  {
    id: "light",
    previewImage: "https://assets.dub.co/cms/bg-share-select-1.png",
  },
  {
    id: "dark",
    previewImage: "https://assets.dub.co/cms/bg-share-select-2.png",
  },
] as const;

type BackgroundType = (typeof BACKGROUND_OPTIONS)[number]["id"];

type ShareEarningsModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  programId: string;
  start?: Date;
  end?: Date;
  interval: IntervalOptions;
  timeseries?: { start: string; earnings: number }[];
};

export function ShareEarningsModal({
  showModal,
  setShowModal,
  programId,
  start,
  end,
  interval,
  timeseries,
}: ShareEarningsModalProps) {
  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-lg"
    >
      <ShareEarningsModalInner
        setShowModal={setShowModal}
        programId={programId}
        start={start}
        end={end}
        interval={interval}
        timeseries={timeseries}
      />
    </Modal>
  );
}

function ShareEarningsModalInner({
  setShowModal,
  programId,
  start,
  end,
  interval,
  timeseries,
}: Omit<ShareEarningsModalProps, "showModal">) {
  const [background, setBackground] = useState<BackgroundType>("light");
  const [isLoading, setIsLoading] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);

  const imageUrl = useMemo(
    () =>
      `/api/og/partner-earnings?${new URLSearchParams({
        programId,
        background,
        interval,
        ...(start && { start: start.toISOString() }),
        ...(end && { end: end.toISOString() }),
      }).toString()}`,
    [programId, background, interval, start, end],
  );

  useEffect(() => {
    if (!programId) return;

    const abortController = new AbortController();

    setIsLoading(true);
    setBlob(null);
    fetch(imageUrl, { signal: abortController.signal })
      .then((res) =>
        res.blob().then((blob) => {
          setBlob(blob);
          setIsLoading(false);
        }),
      )
      .catch((err) => {
        if (err.name === "AbortError") return;
        toast.error("Failed to prepare chart image for sharing");
        setIsLoading(false);
      });

    return () => abortController.abort();
  }, [imageUrl, programId]);

  const handleCopy = async () => {
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
  };

  const handleDownload = () => {
    if (!blob) return;

    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `earnings-chart.png`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="flex flex-col gap-2 px-5 py-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Share chart</h3>
        <button
          type="button"
          onClick={() => setShowModal(false)}
          className="group rounded-lg p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="border-border-subtle scrollbar-hide max-h-[calc(100dvh-280px)] overflow-y-auto rounded-xl border">
        <div className="relative aspect-[1368/994] w-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          )}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Earnings chart"
              className={cn(
                "relative size-full rounded-xl object-contain",
                isLoading && "opacity-0",
              )}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pb-1 pt-2">
        <div className="flex items-center gap-2">
          {BACKGROUND_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setBackground(option.id)}
              className={cn(
                "relative size-6 overflow-hidden rounded-full transition-all",
                option.id === "light" && "border-2 border-neutral-200",
                background === option.id &&
                  "ring-2 ring-neutral-900 ring-offset-2",
              )}
            >
              <img
                src={option.previewImage}
                alt={`${option.id} background`}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            text="Copy"
            variant="secondary"
            disabled={isLoading || !blob}
            onClick={handleCopy}
            className="h-9 w-fit rounded-lg"
          />
          <Button
            text="Download"
            disabled={isLoading || !blob}
            onClick={handleDownload}
            className="h-9 w-fit rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
