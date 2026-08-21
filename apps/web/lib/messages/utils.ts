import { createId } from "@/lib/api/create-id";
import {
  ATTACHMENT_MIME_TYPE_LABELS,
  PREVIEWABLE_IMAGE_TYPES,
} from "./constants";

export const messageAttachmentsOrderBy = { createdAt: "asc" } as const;

type MessageAttachmentInput = {
  storageKey: string;
  name: string;
  size: number;
  type: string;
};

export function mapMessageAttachmentsForCreate(
  attachments: MessageAttachmentInput[],
) {
  const base = Date.now();

  return attachments.map((att, index) => ({
    id: createId({ prefix: "msa_" }),
    storageKey: att.storageKey,
    name: att.name,
    size: att.size,
    type: att.type,
    createdAt: new Date(base + index),
  }));
}

export function sortMessageAttachments<
  T extends { createdAt: Date | string; id: string },
>(attachments: T[]) {
  return [...attachments].sort(
    (a, b) =>
      +new Date(a.createdAt) - +new Date(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}

// Normalize a user-supplied file name
export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\x00-\x1F\x7F/\\?#%]/g, (ch) => encodeURIComponent(ch));
}

export function getAttachmentTypeLabel(mimeType: string): string {
  return (
    ATTACHMENT_MIME_TYPE_LABELS[mimeType] ||
    mimeType.split("/").pop()?.toUpperCase() ||
    "FILE"
  );
}

export function isPreviewableImageType(mimeType: string): boolean {
  return PREVIEWABLE_IMAGE_TYPES.has(mimeType);
}
