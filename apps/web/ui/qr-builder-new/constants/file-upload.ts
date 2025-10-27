export const ROOT_NAME = "FileUpload";
export const DROPZONE_NAME = "FileUploadDropzone";
export const TRIGGER_NAME = "FileUploadTrigger";
export const LIST_NAME = "FileUploadList";
export const ITEM_NAME = "FileUploadItem";
export const ITEM_PREVIEW_NAME = "FileUploadItemPreview";
export const ITEM_METADATA_NAME = "FileUploadItemMetadata";
export const ITEM_PROGRESS_NAME = "FileUploadItemProgress";
export const ITEM_DELETE_NAME = "FileUploadItemDelete";
export const CLEAR_NAME = "FileUploadClear";

export const FILE_UPLOAD_ERRORS = {
  [ROOT_NAME]: `\`${ROOT_NAME}\` must be used as root component`,
  [DROPZONE_NAME]: `\`${DROPZONE_NAME}\` must be within \`${ROOT_NAME}\``,
  [TRIGGER_NAME]: `\`${TRIGGER_NAME}\` must be within \`${ROOT_NAME}\``,
  [LIST_NAME]: `\`${LIST_NAME}\` must be within \`${ROOT_NAME}\``,
  [ITEM_NAME]: `\`${ITEM_NAME}\` must be within \`${ROOT_NAME}\``,
  [ITEM_PREVIEW_NAME]: `\`${ITEM_PREVIEW_NAME}\` must be within \`${ITEM_NAME}\``,
  [ITEM_METADATA_NAME]: `\`${ITEM_METADATA_NAME}\` must be within \`${ITEM_NAME}\``,
  [ITEM_PROGRESS_NAME]: `\`${ITEM_PROGRESS_NAME}\` must be within \`${ITEM_NAME}\``,
  [ITEM_DELETE_NAME]: `\`${ITEM_DELETE_NAME}\` must be within \`${ITEM_NAME}\``,
  [CLEAR_NAME]: `\`${CLEAR_NAME}\` must be within \`${ROOT_NAME}\``,
} as const;
