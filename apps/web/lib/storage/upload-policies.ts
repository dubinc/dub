const RASTER_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const UPLOAD_POLICIES = {
  integrationScreenshots: {
    contentTypes: RASTER_IMAGE_CONTENT_TYPES,
    maxBytes: 5 * 1024 * 1024,
  },
} as const;
