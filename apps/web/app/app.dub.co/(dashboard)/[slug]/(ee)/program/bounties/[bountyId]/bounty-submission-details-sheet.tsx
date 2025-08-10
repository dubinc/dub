"use client";

import { BountySubmissionProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, useRouterStuff } from "@dub/ui";
import { OG_AVATAR_URL } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";

type BountySubmissionDetailsSheetProps = {
  submission: BountySubmissionProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function BountySubmissionDetailsSheetContent({ submission }: BountySubmissionDetailsSheetProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Bounty submission details
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      <div className="flex grow flex-col">
        <div className="border-b border-neutral-200 bg-neutral-50 p-6">
          {/* Basic partner info */}
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="relative w-fit">
                <img
                  src={submission.partner.image || `${OG_AVATAR_URL}${submission.partner.name}`}
                  alt={submission.partner.name}
                  className="size-12 rounded-full"
                />
              </div>
              <div className="mt-4 flex items-start gap-2">
                <span className="text-lg font-semibold leading-tight text-neutral-900">
                  {submission.partner.name}
                </span>
              </div>
              {submission.partner.email && (
                <span className="text-sm text-neutral-500">
                  {submission.partner.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grow overflow-y-auto p-6">
          {/* Content will be added later */}
        </div>
      </div>
    </div>
  );
}



export function BountySubmissionDetailsSheet({
  isOpen,
  ...rest
}: BountySubmissionDetailsSheetProps & {
  isOpen: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "submissionId", scroll: false })}
    >
      <BountySubmissionDetailsSheetContent {...rest} />
    </Sheet>
  );
}

export function useBountySubmissionDetailsSheet(
  props: { nested?: boolean } & Omit<BountySubmissionDetailsSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    BountySubmissionDetailsSheet: (
      <BountySubmissionDetailsSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setShowBountySubmissionDetailsSheet: setIsOpen,
  };
}
