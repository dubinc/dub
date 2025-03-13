"use client";

import { ProgramResourceType } from "@/lib/zod/schemas/program-resources";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  Check,
  Copy,
  Download,
  LoadingSpinner,
  Popover,
  Trash,
  useCopyToClipboard,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { ReactNode, useState } from "react";
import { toast } from "sonner";

export function ResourceCardSkeleton() {
  return (
    <div className="border-border-subtle flex w-full items-center gap-4 rounded-lg border p-4">
      <div className="bg-bg-emphasis flex size-10 shrink-0 animate-pulse items-center justify-center rounded-md" />
      <div className="flex min-w-0 animate-pulse flex-col gap-1">
        <div className="bg-bg-emphasis h-4 w-32 max-w-full rounded-md" />
        <div className="bg-bg-emphasis h-4 w-16 max-w-full rounded-md" />
      </div>
    </div>
  );
}

export function ResourceCard({
  resourceType,
  title,
  description,
  icon,
  onDelete,
  downloadUrl,
  copyText,
}: {
  resourceType: ProgramResourceType;
  title: string;
  description: string;
  icon: ReactNode;
  onDelete?: () => Promise<boolean>;
  downloadUrl?: string;
  copyText?: string;
}) {
  const [openPopover, setOpenPopover] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [copied, copyToClipboard] = useCopyToClipboard();

  const handleDownload = () => window.open(downloadUrl, "_blank");

  return (
    <div className="border-border-subtle flex w-full items-center justify-between gap-4 rounded-lg border p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-4">
        <div className="border-border-subtle flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border">
          {icon}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-content-emphasis truncate text-sm font-medium">
            {title}
          </span>
          <span className="text-content-subtle truncate text-xs">
            {description}
          </span>
        </div>
      </div>
      <div className="relative">
        {onDelete || (downloadUrl && copyText) ? (
          <Popover
            content={
              <div className="grid w-full grid-cols-1 gap-px p-2 sm:w-48">
                {downloadUrl && (
                  <Button
                    text="Download"
                    variant="outline"
                    onClick={() => {
                      handleDownload();
                      setOpenPopover(false);
                    }}
                    icon={<Download className="size-4" />}
                    className="h-9 justify-start px-2 font-medium"
                  />
                )}
                {copyText && (
                  <Button
                    text="Copy"
                    variant="outline"
                    onClick={() => {
                      copyToClipboard(copyText, {
                        onSuccess: () => toast.success("Copied to clipboard"),
                      });
                      setOpenPopover(false);
                    }}
                    icon={<Copy className="size-4" />}
                    className="h-9 justify-start px-2 font-medium"
                  />
                )}
                {onDelete && (
                  <Button
                    text={`Delete ${resourceType}`}
                    variant="danger-outline"
                    onClick={async () => {
                      setOpenPopover(false);

                      if (
                        !confirm(
                          "Are you sure you want to delete this resource?",
                        )
                      )
                        return;

                      setIsDeleting(true);
                      const success = await onDelete();
                      if (success) setIsDeleting(false);
                    }}
                    icon={<Trash className="size-4" />}
                    className="h-9 justify-start px-2 font-medium"
                  />
                )}
              </div>
            }
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          >
            <Button
              variant="secondary"
              className={cn(
                "text-content-subtle h-8 px-1.5 outline-none transition-all duration-200",
                "data-[state=open]:border-border-emphasis sm:group-hover/card:data-[state=closed]:border-border-subtle border-transparent",
              )}
              icon={
                isDeleting ? (
                  <LoadingSpinner className="size-4 shrink-0" />
                ) : (
                  <ThreeDots className="size-4 shrink-0" />
                )
              }
              onClick={() => {
                setOpenPopover(!openPopover);
              }}
            />
          </Popover>
        ) : (
          <>
            {downloadUrl && (
              <Button
                icon={<Download className="size-4" />}
                text="Download"
                variant="secondary"
                className="h-8 px-3"
                onClick={handleDownload}
              />
            )}
            {copyText && (
              <Button
                icon={
                  <div className="relative size-4">
                    <div
                      className={cn(
                        "absolute inset-0 transition-[transform,opacity]",
                        copied && "translate-y-1 opacity-0",
                      )}
                    >
                      <Copy className="size-4" />
                    </div>
                    <div
                      className={cn(
                        "absolute inset-0 transition-[transform,opacity]",
                        !copied && "translate-y-1 opacity-0",
                      )}
                    >
                      <Check className="size-4" />
                    </div>
                  </div>
                }
                text={copied ? "Copied" : "Copy"}
                variant="secondary"
                className="h-8 px-3"
                onClick={() => copyToClipboard(copyText)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
