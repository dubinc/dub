"use client";

import { cn } from "@dub/utils";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { ITEM_NAME } from "../../constants/file-upload";
import type { FileUploadItemProps } from "../../types/file-upload";
import {
  FileUploadItemContext,
  useFileUploadContext,
  useStore,
} from "./context";

const FileUploadItem = React.forwardRef<HTMLDivElement, FileUploadItemProps>(
  (props, forwardedRef) => {
    const { value, asChild, className, ...itemProps } = props;

    const id = React.useId();
    const statusId = `${id}-status`;
    const nameId = `${id}-name`;
    const sizeId = `${id}-size`;
    const messageId = `${id}-message`;

    const context = useFileUploadContext(ITEM_NAME);
    const fileState = useStore((state) => state.files.get(value));
    const fileCount = useStore((state) => state.files.size);
    const fileIndex = useStore((state) => {
      const files = Array.from(state.files.keys());
      return files.indexOf(value) + 1;
    });

    const itemContext = React.useMemo(
      () => ({
        id,
        fileState,
        nameId,
        sizeId,
        statusId,
        messageId,
      }),
      [id, fileState, statusId, nameId, sizeId, messageId],
    );

    if (!fileState) return null;

    const statusText = fileState.error
      ? `Error: ${fileState.error}`
      : fileState.status === "uploading"
        ? `Uploading: ${fileState.progress}% complete`
        : fileState.status === "success"
          ? "Upload complete"
          : "Ready to upload";

    const ItemPrimitive = asChild ? Slot : "div";

    return (
      <FileUploadItemContext.Provider value={itemContext}>
        <ItemPrimitive
          role="listitem"
          id={id}
          aria-setsize={fileCount}
          aria-posinset={fileIndex}
          aria-describedby={`${nameId} ${sizeId} ${statusId} ${
            fileState.error ? messageId : ""
          }`}
          aria-labelledby={nameId}
          data-slot="file-upload-item"
          dir={context.dir}
          {...itemProps}
          ref={forwardedRef}
          className={cn(
            "relative flex flex-col items-center gap-2.5 rounded-md border p-3",
            className,
          )}
        >
          {props.children}
          <span id={statusId} className="sr-only">
            {statusText}
          </span>
        </ItemPrimitive>
      </FileUploadItemContext.Provider>
    );
  },
);
FileUploadItem.displayName = ITEM_NAME;

export { FileUploadItem };
