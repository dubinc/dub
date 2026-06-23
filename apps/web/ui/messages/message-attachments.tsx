"use client";

import {
  getAttachmentTypeLabel,
  isPreviewableImageType,
  sortMessageAttachments,
} from "@/lib/messages/utils";
import { MessageAttachment } from "@/lib/types";
import { formatFileSize } from "@dub/utils";
import { cn } from "@dub/utils/src";
import { Download, File } from "lucide-react";
import { toast } from "sonner";
import { ZoomImage } from "../shared/zoom-image";

async function downloadFile(url: string, filename: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    toast.error("Failed to download file. Please try again.");
  }
}

export const ATTACHMENT_MIME_TYPE_COLOR: Record<string, string> = {
  "application/pdf": "bg-rose-600",
  "image/png": "bg-blue-600",
  "image/jpeg": "bg-blue-500",
  "image/webp": "bg-blue-500",
};

export function MessageAttachmentsList({
  attachments,
  isMySide,
}: {
  attachments: MessageAttachment[];
  isMySide: boolean;
}) {
  if (attachments.length === 0) {
    return null;
  }

  const sortedAttachments = sortMessageAttachments(attachments);

  return (
    <div
      className={cn(
        "flex w-fit max-w-[min(100%,512px)] flex-col gap-1",
        isMySide ? "self-end" : "self-start",
      )}
    >
      {sortedAttachments.map((attachment) =>
        isPreviewableImageType(attachment.type) ? (
          <MessageImageAttachment key={attachment.id} attachment={attachment} />
        ) : (
          <MessageFileAttachment key={attachment.id} attachment={attachment} />
        ),
      )}
    </div>
  );
}

function MessageImageAttachment({
  attachment,
}: {
  attachment: MessageAttachment;
}) {
  return (
    <div className="group relative">
      {attachment.signedUrl ? (
        <>
          <ZoomImage
            src={attachment.signedUrl}
            alt={attachment.name}
            className="max-h-64 w-full cursor-pointer rounded-lg border border-neutral-200 object-cover"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              downloadFile(attachment.signedUrl!, attachment.name);
            }}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md bg-white/70 text-neutral-600 opacity-0 backdrop-blur-sm transition-opacity hover:bg-white/90 group-hover:opacity-100"
          >
            <Download className="size-3.5" />
          </button>
        </>
      ) : (
        <div className="h-40 w-full animate-pulse rounded-lg bg-neutral-200" />
      )}
    </div>
  );
}

function MessageFileAttachment({
  attachment,
}: {
  attachment: MessageAttachment;
}) {
  return (
    <button
      type="button"
      disabled={!attachment.signedUrl}
      onClick={() =>
        attachment.signedUrl &&
        downloadFile(attachment.signedUrl, attachment.name)
      }
      className={cn(
        "flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-1 pr-3 text-left transition-colors",
        attachment.signedUrl
          ? "hover:bg-neutral-100"
          : "cursor-default opacity-60",
      )}
    >
      <FileTypeBadge type={attachment.type} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-content-default truncate text-sm font-medium">
          {attachment.name}
        </span>
        <span className="text-content-subtle text-xs font-medium">
          {formatFileSize(attachment.size, 1)}
        </span>
      </div>
      <div className="border-bg-subtle flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white">
        <Download className="text-content-emphasis size-4 shrink-0" />
      </div>
    </button>
  );
}

function FileTypeBadge({ type }: { type: string }) {
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md text-xs font-semibold uppercase text-white",
        ATTACHMENT_MIME_TYPE_COLOR[type] || "bg-neutral-500",
      )}
    >
      <File className="size-3 shrink-0" />
      <span>{getAttachmentTypeLabel(type)}</span>
    </div>
  );
}
