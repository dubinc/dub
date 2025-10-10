"use client";

import { cn } from "@dub/utils";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { LIST_NAME } from "../../constants/file-upload";
import type { FileUploadListProps } from "../../types/file-upload";
import { useFileUploadContext, useStore } from "./context";

const FileUploadList = React.forwardRef<HTMLDivElement, FileUploadListProps>(
  (props, forwardedRef) => {
    const {
      className,
      orientation = "vertical",
      asChild,
      forceMount,
      ...listProps
    } = props;

    const context = useFileUploadContext(LIST_NAME);

    const shouldRender =
      forceMount || useStore((state) => state.files.size > 0);

    if (!shouldRender) return null;

    const ListPrimitive = asChild ? Slot : "div";

    return (
      <ListPrimitive
        role="list"
        id={context.listId}
        aria-orientation={orientation}
        data-orientation={orientation}
        data-slot="file-upload-list"
        data-state={shouldRender ? "active" : "inactive"}
        dir={context.dir}
        {...listProps}
        ref={forwardedRef}
        className={cn(
          "data-[state=inactive]:fade-out-0 data-[state=active]:fade-in-0 data-[state=inactive]:slide-out-to-top-2 data-[state=active]:slide-in-from-top-2 data-[state=active]:animate-in data-[state=inactive]:animate-out flex flex-col gap-2",
          orientation === "horizontal" && "flex-row overflow-x-auto p-1.5",
          className,
        )}
      />
    );
  },
);
FileUploadList.displayName = LIST_NAME;

export { FileUploadList };
