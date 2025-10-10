"use client";

// Export components
export { FileUploadClear } from "./clear";
export { FileUploadDropzone } from "./dropzone";
export { FileUploadItem } from "./item";
export { FileUploadItemDelete } from "./item-delete";
export { FileUploadItemMetadata } from "./item-metadata";
export { FileUploadItemPreview } from "./item-preview";
export { FileUploadItemProgress } from "./item-progress";
export { FileUploadList } from "./list";
export { FileUploadRoot } from "./root";
export { FileUploadTrigger } from "./trigger";

// Export hook
export { useStore as useFileUpload } from "./context";

// Import for convenience exports
import { FileUploadClear } from "./clear";
import { FileUploadDropzone } from "./dropzone";
import { FileUploadItem } from "./item";
import { FileUploadItemDelete } from "./item-delete";
import { FileUploadItemMetadata } from "./item-metadata";
import { FileUploadItemPreview } from "./item-preview";
import { FileUploadItemProgress } from "./item-progress";
import { FileUploadList } from "./list";
import { FileUploadRoot } from "./root";
import { FileUploadTrigger } from "./trigger";

// Convenience exports
export const FileUpload = FileUploadRoot;
export const Root = FileUploadRoot;
export const Trigger = FileUploadTrigger;
export const Dropzone = FileUploadDropzone;
export const List = FileUploadList;
export const Item = FileUploadItem;
export const ItemPreview = FileUploadItemPreview;
export const ItemMetadata = FileUploadItemMetadata;
export const ItemProgress = FileUploadItemProgress;
export const ItemDelete = FileUploadItemDelete;
export const Clear = FileUploadClear;
