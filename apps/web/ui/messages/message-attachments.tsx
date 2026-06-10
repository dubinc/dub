"use client";

import { ATTACHMENT_MIME_TYPE_COLOR } from "@/lib/messages/constants";
import { getAttachmentTypeLabel } from "@/lib/messages/utils";
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

export function MessageImageAttachments({
  attachments,
}: {
  attachments: MessageAttachment[];
}) {
  return (
    <div className="flex max-w-[min(100%,512px)] flex-col gap-1">
      {attachments.map((img) => (
        <div key={img.id} className="group relative">
          {img.signedUrl ? (
            <>
              <ZoomImage
                src={img.signedUrl}
                alt={img.name}
                className="max-h-64 w-full cursor-pointer rounded-lg border border-neutral-200 object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadFile(img.signedUrl!, img.name);
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
      ))}
    </div>
  );
}

export function MessageFileAttachments({
  attachments,
}: {
  attachments: MessageAttachment[];
}) {
  return (
    <div className="flex max-w-[min(100%,512px)] flex-col gap-2">
      {attachments.map((file) => (
        <button
          key={file.id}
          type="button"
          disabled={!file.signedUrl}
          onClick={() =>
            file.signedUrl && downloadFile(file.signedUrl, file.name)
          }
          className={cn(
            "flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-left transition-colors",
            file.signedUrl
              ? "hover:bg-neutral-100"
              : "cursor-default opacity-60",
          )}
        >
          <FileTypeBadge type={file.type} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-content-default truncate text-sm font-medium">
              {file.name}
            </span>
            <span className="text-content-subtle text-xs font-medium">
              {formatFileSize(file.size, 1)}
            </span>
          </div>
          <div className="border-bg-subtle rounded-lg border bg-white px-3 py-2">
            <Download className="text-content-emphasis size-4 shrink-0" />
          </div>
        </button>
      ))}
    </div>
  );
}

function FileTypeBadge({ type }: { type: string }) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 flex-col items-center justify-center gap-1 rounded-lg p-2 text-xs font-semibold uppercase text-white",
        ATTACHMENT_MIME_TYPE_COLOR[type] || "bg-neutral-500",
      )}
    >
      <File className="size-3 shrink-0" />
      <span>{getAttachmentTypeLabel(type)}</span>
    </div>
  );
}
