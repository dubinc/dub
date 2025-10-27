"use client";

import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { TRIGGER_NAME } from "../../constants/file-upload";
import { useAsRef } from "../../hooks/use-as-ref";
import type { FileUploadTriggerProps } from "../../types/file-upload";
import { useFileUploadContext } from "./context";

const FileUploadTrigger = React.forwardRef<
  HTMLButtonElement,
  FileUploadTriggerProps
>((props, forwardedRef) => {
  const { asChild, ...triggerProps } = props;
  const context = useFileUploadContext(TRIGGER_NAME);
  const propsRef = useAsRef(triggerProps);

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      propsRef.current?.onClick?.(event);

      if (event.defaultPrevented) return;

      context.inputRef.current?.click();
    },
    [context.inputRef, propsRef.current],
  );

  const TriggerPrimitive = asChild ? Slot : "button";

  return (
    <TriggerPrimitive
      type="button"
      aria-controls={context.inputId}
      data-disabled={context.disabled ? "" : undefined}
      data-slot="file-upload-trigger"
      {...triggerProps}
      ref={forwardedRef}
      disabled={context.disabled}
      onClick={onClick}
    />
  );
});
FileUploadTrigger.displayName = TRIGGER_NAME;

export { FileUploadTrigger };
