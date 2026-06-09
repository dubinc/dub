"use client";

import { MessageAttachment } from "@/lib/types";
import { getAttachmentTypeLabel } from "@/lib/zod/schemas/messages";
import { cn, formatFileSize } from "@dub/utils";
import { Download } from "lucide-react";
import { ZoomImage } from "../shared/zoom-image";

export function MessageImageAttachments({
  attachments,
  invert,
}: {
  attachments: MessageAttachment[];
  invert: boolean;
}) {
  return (
    <div className="flex max-w-[min(100%,512px)] flex-col gap-1">
      {attachments.map((img) => (
        <div key={img.id} className="group relative">
          <ZoomImage
            src={img.url}
            alt={img.name}
            className={cn(
              "max-h-64 w-full cursor-pointer rounded-lg object-cover",
              invert ? "border-neutral-600" : "border-neutral-200",
            )}
          />
          <a
            href={img.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute right-2 top-2 flex size-7 items-center justify-center rounded-md opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100",
              invert
                ? "bg-neutral-800/70 text-neutral-200 hover:bg-neutral-800/90"
                : "bg-white/70 text-neutral-600 hover:bg-white/90",
            )}
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
  invert,
}: {
  attachments: MessageAttachment[];
  invert: boolean;
}) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {attachments.map((file) => (
        <a
          key={file.id}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
            invert
              ? "border-neutral-600 hover:bg-neutral-600"
              : "border-neutral-200 hover:bg-neutral-50",
          )}
        >
          <FileTypeBadge type={file.type} invert={invert} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              className={cn(
                "truncate text-xs font-medium",
                invert ? "text-neutral-100" : "text-neutral-900",
              )}
            >
              {file.name}
            </span>
            <span
              className={cn(
                "text-[10px]",
                invert ? "text-neutral-400" : "text-neutral-500",
              )}
            >
              {formatFileSize(file.size, 1)}
            </span>
          </div>
          <Download
            className={cn(
              "size-3.5 shrink-0",
              invert ? "text-neutral-400" : "text-neutral-500",
            )}
          />
        </a>
      ))}
    </div>
  );
}

function FileTypeBadge({ type, invert }: { type: string; invert: boolean }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold uppercase",
        invert
          ? "bg-neutral-600 text-neutral-200"
          : "bg-neutral-100 text-neutral-600",
      )}
    >
      {getAttachmentTypeLabel(type)}
    </div>
  );
}
