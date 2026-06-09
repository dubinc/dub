"use client";

import { MessageAttachment } from "@/lib/types";
import {
  ATTACHMENT_MIME_TYPE_COLOR,
  getAttachmentTypeLabel,
} from "@/lib/zod/schemas/messages";
import { formatFileSize } from "@dub/utils";
import { cn } from "@dub/utils/src";
import { Download, File } from "lucide-react";
import { ZoomImage } from "../shared/zoom-image";

export function MessageImageAttachments({
  attachments,
}: {
  attachments: MessageAttachment[];
}) {
  return (
    <div className="flex max-w-[min(100%,512px)] flex-col gap-1">
      {attachments.map((img) => (
        <div key={img.id} className="group relative">
          <ZoomImage
            src={img.url}
            alt={img.name}
            className="max-h-64 w-full cursor-pointer rounded-lg border border-neutral-200 object-cover"
          />
          <a
            href={img.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md bg-white/70 text-neutral-600 opacity-0 backdrop-blur-sm transition-opacity hover:bg-white/90 group-hover:opacity-100"
          >
            <Download className="size-3.5" />
          </a>
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
        <a
          key={file.id}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 transition-colors hover:bg-neutral-100"
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
            <Download className="text-content-emphasis size-3 shrink-0" />
          </div>
        </a>
      ))}
    </div>
  );
}

function FileTypeBadge({ type }: { type: string }) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 flex-col items-center justify-center gap-1 rounded-lg p-2 text-xs font-semibold uppercase text-white",
        ATTACHMENT_MIME_TYPE_COLOR[type],
      )}
    >
      <File className="size-3 shrink-0" />
      <span>{getAttachmentTypeLabel(type)}</span>
    </div>
  );
}
