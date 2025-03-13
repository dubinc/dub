"use client";

import { AnimatedSizeContainer, Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";
import { ResourceCardSkeleton } from "./resource-card";

export function ResourceSection({
  resource,
  title,
  description,
  isLoading,
  isValidating,
  onAdd,
  children,
}: PropsWithChildren<{
  resource: string;
  title: string;
  description?: string;
  isLoading?: boolean;
  isValidating?: boolean;
  onAdd?: () => void;
}>) {
  return (
    <div className="border-border-subtle grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2 sm:p-6">
      <div>
        <h2 className="text-content-emphasis text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-content-subtle text-sm">{description}</p>
        )}
      </div>
      <div className="-m-1">
        <AnimatedSizeContainer
          height={!isLoading}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <div
            className={cn(
              "flex flex-col items-end gap-4 p-1 transition-opacity",
              isValidating && "opacity-50",
            )}
          >
            {isLoading ? <ResourceCardSkeleton /> : children}
            {onAdd && (
              <Button
                type="button"
                text={`Add ${resource}`}
                onClick={onAdd}
                className="h-8 w-fit px-3"
              />
            )}
          </div>
        </AnimatedSizeContainer>
      </div>
    </div>
  );
}
