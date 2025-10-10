"use client";

import { cn } from "@dub/utils";
import { Slot } from "@radix-ui/react-slot";
import Image from "next/image";
import * as React from "react";

import { ITEM_PREVIEW_NAME } from "../../constants/file-upload";
import { getFileIcon } from "../../helpers/file-upload";
import type { FileUploadItemPreviewProps } from "../../types/file-upload";
import { useFileUploadItemContext } from "./context";

const FileUploadItemPreview = React.forwardRef<
  HTMLDivElement,
  FileUploadItemPreviewProps
>((props, forwardedRef) => {
  const { render, asChild, children, className, ...previewProps } = props;

  const itemContext = useFileUploadItemContext(ITEM_PREVIEW_NAME);

  const onPreviewRender = React.useCallback(
    (file: File) => {
      if (render) return render(file);

      if (itemContext.fileState?.file.type.startsWith("image/")) {
        return (
          <Image
            src={URL.createObjectURL(file)}
            alt={file.name}
            fill
            className="object-cover"
            onLoad={(event) => {
              if (!(event.target instanceof HTMLImageElement)) return;
              URL.revokeObjectURL(event.target.src);
            }}
          />
        );
      }

      return getFileIcon(file);
    },
    [render, itemContext.fileState?.file.type],
  );

  if (!itemContext.fileState) return null;

  const ItemPreviewPrimitive = asChild ? Slot : "div";

  return (
    <ItemPreviewPrimitive
      aria-labelledby={itemContext.nameId}
      data-slot="file-upload-preview"
      {...previewProps}
      ref={forwardedRef}
      className={cn(
        "bg-accent/50 relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border [&>svg]:size-10",
        className,
      )}
    >
      {onPreviewRender(itemContext.fileState.file)}
      {children}
    </ItemPreviewPrimitive>
  );
});
FileUploadItemPreview.displayName = ITEM_PREVIEW_NAME;

export { FileUploadItemPreview };
