export const MAX_MESSAGE_LENGTH = 2000;

export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const MAX_ATTACHMENT_NAME_LENGTH = 255;

export const PROGRAM_ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export const PARTNER_ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const ATTACHMENT_MIME_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
};

// MIME types that are safe to render as inline image previews.
export const PREVIEWABLE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
