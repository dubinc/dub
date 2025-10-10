"use client";

import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { ITEM_DELETE_NAME } from "../../constants/file-upload";
import { useAsRef } from "../../hooks/use-as-ref";
import type { FileUploadItemDeleteProps } from "../../types/file-upload";
import { useFileUploadItemContext, useStoreContext } from "./context";

const FileUploadItemDelete = React.forwardRef<
  HTMLButtonElement,
  FileUploadItemDeleteProps
>((props, forwardedRef) => {
  const { asChild, ...deleteProps } = props;

  const store = useStoreContext(ITEM_DELETE_NAME);
  const itemContext = useFileUploadItemContext(ITEM_DELETE_NAME);
  const propsRef = useAsRef(deleteProps);

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      propsRef.current?.onClick?.(event);

      if (!itemContext.fileState || event.defaultPrevented) return;

      store.dispatch({
        variant: "REMOVE_FILE",
        file: itemContext.fileState.file,
      });
    },
    [store, itemContext.fileState, propsRef.current?.onClick],
  );

  if (!itemContext.fileState) return null;

  const ItemDeletePrimitive = asChild ? Slot : "button";

  return (
    <ItemDeletePrimitive
      type="button"
      aria-controls={itemContext.id}
      aria-describedby={itemContext.nameId}
      data-slot="file-upload-item-delete"
      {...deleteProps}
      ref={forwardedRef}
      onClick={onClick}
    />
  );
});
FileUploadItemDelete.displayName = ITEM_DELETE_NAME;

export { FileUploadItemDelete };
