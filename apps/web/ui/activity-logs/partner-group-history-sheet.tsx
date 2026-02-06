"use client";

import { useActivityLogs } from "@/lib/swr/use-activity-logs";
import { EnrolledPartnerExtendedProps } from "@/lib/types";
import { PartnerGroupActivitySection } from "@/ui/activity-logs/partner-group-activity-section";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { Dispatch, SetStateAction, useState } from "react";

interface PartnerGroupHistorySheetProps {
  partner: Pick<EnrolledPartnerExtendedProps, "id">;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function PartnerGroupHistorySheetContent({
  partner,
}: Omit<PartnerGroupHistorySheetProps, "isOpen">) {
  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Partner group history
        </Sheet.Title>
        <Sheet.Close asChild>
          <Button
            variant="outline"
            icon={<X className="size-5" />}
            className="h-auto w-fit p-1"
          />
        </Sheet.Close>
      </div>

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
        <PartnerGroupActivitySection partnerId={partner.id} />
      </div>
    </div>
  );
}

export function PartnerGroupHistorySheet({
  isOpen,
  ...rest
}: PartnerGroupHistorySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <PartnerGroupHistorySheetContent {...rest} />
    </Sheet>
  );
}

export function usePartnerGroupHistorySheet({
  partner,
}: {
  partner: Pick<EnrolledPartnerExtendedProps, "id"> | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const { activityLogs } = useActivityLogs({
    query: partner
      ? {
          resourceType: "partner",
          resourceId: partner.id,
          action: "partner.groupChanged",
        }
      : undefined,
    enabled: !!partner?.id,
  });

  return {
    hasActivityLogs: (activityLogs?.length ?? 0) > 0,
    partnerGroupHistorySheet: partner ? (
      <PartnerGroupHistorySheet
        partner={partner}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    ) : null,
    setIsOpen,
  };
}
