"use client";

import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { CLEAR_NAME } from "../../constants/file-upload";
import { useAsRef } from "../../hooks/use-as-ref";
import type { FileUploadClearProps } from "../../types/file-upload";
import { useFileUploadContext, useStore, useStoreContext } from "./context";

const FileUploadClear = React.forwardRef<
  HTMLButtonElement,
  FileUploadClearProps
>((props, forwardedRef) => {
  const { asChild, forceMount, disabled, ...clearProps } = props;

  const context = useFileUploadContext(CLEAR_NAME);
  const store = useStoreContext(CLEAR_NAME);
  const propsRef = useAsRef(clearProps);

  const isDisabled = disabled || context.disabled;

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      propsRef.current?.onClick?.(event);

      if (event.defaultPrevented) return;

      store.dispatch({ variant: "CLEAR" });
    },
    [store, propsRef],
  );

  const shouldRender = forceMount || useStore((state) => state.files.size > 0);

  if (!shouldRender) return null;

  const ClearPrimitive = asChild ? Slot : "button";

  return (
    <ClearPrimitive
      type="button"
      aria-controls={context.listId}
      data-slot="file-upload-clear"
      data-disabled={isDisabled ? "" : undefined}
      {...clearProps}
      ref={forwardedRef}
      disabled={isDisabled}
      onClick={onClick}
    />
  );
});
FileUploadClear.displayName = CLEAR_NAME;

export { FileUploadClear };
