"use client";

import { FraudEventProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Sheet,
  useKeyboardShortcut,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";

interface FraudReviewSheetProps {
  fraudEvent: FraudEventProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onNext?: () => void;
  onPrevious?: () => void;
}

function FraudReviewSheetContent({
  fraudEvent,
  onPrevious,
  onNext,
}: FraudReviewSheetProps) {
  // Left/right arrow keys for previous/next fraud event
  useKeyboardShortcut("ArrowRight", () => onNext?.(), { sheet: true });
  useKeyboardShortcut("ArrowLeft", () => onPrevious?.(), { sheet: true });

  return (
    <div className="relative h-full">
      <div
        className={cn("flex h-full flex-col transition-opacity duration-200")}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Fraud review
          </Sheet.Title>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Button
                type="button"
                disabled={!onPrevious}
                onClick={onPrevious}
                variant="secondary"
                className="size-9 rounded-l-lg rounded-r-none p-0"
                icon={<ChevronLeft className="size-3.5" />}
              />
              <Button
                type="button"
                disabled={!onNext}
                onClick={onNext}
                variant="secondary"
                className="-ml-px size-9 rounded-l-none rounded-r-lg p-0"
                icon={<ChevronRight className="size-3.5" />}
              />
            </div>
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
        </div>

        <div className="p-6">WIP: {JSON.stringify(fraudEvent)}</div>

        <div className="flex grow flex-col justify-end p-5">controls</div>
      </div>
    </div>
  );
}

export function FraudReviewSheet({
  isOpen,
  nested,
  ...rest
}: FraudReviewSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      nested={nested}
      contentProps={{
        className: "[--sheet-width:940px]",
      }}
    >
      <FraudReviewSheetContent {...rest} />
    </Sheet>
  );
}

export function useFraudReviewSheet(
  props: Omit<FraudReviewSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    fraudReviewSheet: (
      <FraudReviewSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
