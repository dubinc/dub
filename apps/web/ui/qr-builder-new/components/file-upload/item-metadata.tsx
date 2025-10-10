"use client";

import { cn } from "@dub/utils";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { ITEM_METADATA_NAME } from "../../constants/file-upload";
import { formatBytes } from "../../helpers/file-upload";
import type { FileUploadItemMetadataProps } from "../../types/file-upload";
import { useFileUploadContext, useFileUploadItemContext } from "./context";

const FileUploadItemMetadata = React.forwardRef<
  HTMLDivElement,
  FileUploadItemMetadataProps
>((props, forwardedRef) => {
  const {
    asChild,
    size = "default",
    children,
    className,
    ...metadataProps
  } = props;

  const context = useFileUploadContext(ITEM_METADATA_NAME);
  const itemContext = useFileUploadItemContext(ITEM_METADATA_NAME);

  if (!itemContext.fileState) return null;

  // Check if file is a thumbnail
  const file = itemContext.fileState.file as any;
  const isThumbnail = file?.isThumbnail;
  const originalFileName = file?.originalFileName;
  const originalFileSize = file?.originalFileSize;

  const displayName =
    isThumbnail && originalFileName
      ? originalFileName
      : itemContext.fileState.file.name;
  const displaySize =
    isThumbnail && originalFileSize
      ? formatBytes(originalFileSize)
      : formatBytes(itemContext.fileState.file.size);

  const ItemMetadataPrimitive = asChild ? Slot : "div";

  return (
    <ItemMetadataPrimitive
      data-slot="file-upload-metadata"
      dir={context.dir}
      {...metadataProps}
      ref={forwardedRef}
      className={cn("flex min-w-0 flex-1 flex-col", className)}
    >
      {children ?? (
        <>
          <span
            id={itemContext.nameId}
            className={cn(
              "truncate text-sm font-medium",
              size === "sm" && "text-[13px] font-normal leading-snug",
            )}
          >
            {displayName}
          </span>
          <span
            id={itemContext.sizeId}
            className={cn(
              "text-muted-foreground truncate text-xs",
              size === "sm" && "text-[11px]",
            )}
          >
            {displaySize}
          </span>
          {itemContext.fileState.error && (
            <span
              id={itemContext.messageId}
              className="text-destructive text-xs"
            >
              {itemContext.fileState.error}
            </span>
          )}
        </>
      )}
    </ItemMetadataPrimitive>
  );
});
FileUploadItemMetadata.displayName = ITEM_METADATA_NAME;

export { FileUploadItemMetadata };
