const RASTER_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

const PROGRAM_RESOURCE_LOGO_CONTENT_TYPES = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
] as const;

const PROGRAM_RESOURCE_FILE_CONTENT_TYPES = [
  ...PROGRAM_RESOURCE_LOGO_CONTENT_TYPES,
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/zip",
] as const;

// Human-readable labels for MIME types used across upload policies.
const MIME_TYPE_LABELS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
  "image/gif": "GIF",
  "image/avif": "AVIF",
  "image/svg+xml": "SVG",
  "application/pdf": "PDF",
  "text/plain": "TXT",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "text/csv": "CSV",
  "application/zip": "ZIP",
};

export const UPLOAD_POLICIES = {
  integrationScreenshots: {
    contentTypes: RASTER_IMAGE_CONTENT_TYPES,
    maxBytes: 5 * 1024 * 1024,
  },

  programLogos: {
    contentTypes: RASTER_IMAGE_CONTENT_TYPES,
    maxBytes: 5 * 1024 * 1024,
  },

  programApplicationImages: {
    contentTypes: RASTER_IMAGE_CONTENT_TYPES,
    maxBytes: 5 * 1024 * 1024,
  },

  programCampaignImages: {
    contentTypes: RASTER_IMAGE_CONTENT_TYPES,
    maxBytes: 5 * 1024 * 1024,
  },

  programLanderImages: {
    contentTypes: PROGRAM_RESOURCE_LOGO_CONTENT_TYPES,
    maxBytes: 5 * 1024 * 1024,
  },

  programMessageAttachments: {
    contentTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
    maxBytes: 10 * 1024 * 1024,
  },

  partnerMessageAttachments: {
    contentTypes: ["image/png", "image/jpeg", "image/webp"],
    maxBytes: 10 * 1024 * 1024,
  },

  programResourceLogos: {
    contentTypes: PROGRAM_RESOURCE_LOGO_CONTENT_TYPES,
    maxBytes: 10 * 1024 * 1024,
  },

  programResourceFiles: {
    contentTypes: PROGRAM_RESOURCE_FILE_CONTENT_TYPES,
    maxBytes: 10 * 1024 * 1024,
  },

  bountySubmissionImages: {
    contentTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ] as const,
    maxBytes: 5 * 1024 * 1024,
  },
} as const;

export function getMimeTypeLabel(mimeType: string): string {
  return (
    MIME_TYPE_LABELS[mimeType] ||
    mimeType.split("/").pop()?.toUpperCase() ||
    "FILE"
  );
}
