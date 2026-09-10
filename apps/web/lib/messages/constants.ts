export const MAX_MESSAGE_LENGTH = 2000;

export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

export const MAX_ATTACHMENT_NAME_LENGTH = 255;

// MIME types that are safe to render as inline image previews.
export const PREVIEWABLE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
