import {
  ATTACHMENT_MIME_TYPE_LABELS,
  PREVIEWABLE_IMAGE_TYPES,
} from "../zod/schemas/messages";

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
