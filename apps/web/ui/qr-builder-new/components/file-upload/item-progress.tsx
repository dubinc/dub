"use client";

import { cn } from "@dub/utils";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { ITEM_PROGRESS_NAME } from "../../constants/file-upload";
import type { FileUploadItemProgressProps } from "../../types/file-upload";
import { useFileUploadItemContext } from "./context";

const FileUploadItemProgress = React.forwardRef<
  HTMLDivElement,
  FileUploadItemProgressProps
>((props, forwardedRef) => {
  const {
    variant = "linear",
    size = 40,
    asChild,
    forceMount,
    className,
    ...progressProps
  } = props;

  const itemContext = useFileUploadItemContext(ITEM_PROGRESS_NAME);

  if (!itemContext.fileState) return null;

  const shouldRender = forceMount || itemContext.fileState.progress !== 100;

  if (!shouldRender) return null;

  const ItemProgressPrimitive = asChild ? Slot : "div";

  switch (variant) {
    case "circular": {
      const circumference = 2 * Math.PI * ((size - 4) / 2);
      const strokeDashoffset =
        circumference - (itemContext.fileState.progress / 100) * circumference;

      return (
        <ItemProgressPrimitive
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={itemContext.fileState.progress}
          aria-valuetext={`${itemContext.fileState.progress}%`}
          aria-labelledby={itemContext.nameId}
          data-slot="file-upload-progress"
          {...progressProps}
          ref={forwardedRef}
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            className,
          )}
        >
          <svg
            className="rotate-[-90deg] transform"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            fill="none"
            stroke="currentColor"
          >
            <circle
              className="text-primary/20"
              strokeWidth="2"
              cx={size / 2}
              cy={size / 2}
              r={(size - 4) / 2}
            />
            <circle
              className="text-primary transition-[stroke-dashoffset] duration-300 ease-linear"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              cx={size / 2}
              cy={size / 2}
              r={(size - 4) / 2}
            />
          </svg>
        </ItemProgressPrimitive>
      );
    }

    case "fill": {
      const progressPercentage = itemContext.fileState.progress;
      const topInset = 100 - progressPercentage;

      return (
        <ItemProgressPrimitive
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercentage}
          aria-valuetext={`${progressPercentage}%`}
          aria-labelledby={itemContext.nameId}
          data-slot="file-upload-progress"
          {...progressProps}
          ref={forwardedRef}
          className={cn(
            "bg-primary/50 absolute inset-0 transition-[clip-path] duration-300 ease-linear",
            className,
          )}
          style={{
            clipPath: `inset(${topInset}% 0% 0% 0%)`,
          }}
        />
      );
    }

    default:
      return (
        <ItemProgressPrimitive
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={itemContext.fileState.progress}
          aria-valuetext={`${itemContext.fileState.progress}%`}
          aria-labelledby={itemContext.nameId}
          data-slot="file-upload-progress"
          {...progressProps}
          ref={forwardedRef}
          className={cn(
            "bg-primary/20 relative h-1.5 w-full overflow-hidden rounded-full",
            className,
          )}
        >
          <div
            className="bg-primary h-full w-full flex-1 transition-transform duration-300 ease-linear"
            style={{
              transform: `translateX(-${100 - itemContext.fileState.progress}%)`,
            }}
          />
        </ItemProgressPrimitive>
      );
  }
});
FileUploadItemProgress.displayName = ITEM_PROGRESS_NAME;

export { FileUploadItemProgress };
