"use client";

import { useActivityLogs } from "@/lib/swr/use-activity-logs";
import { EnrolledPartnerExtendedProps } from "@/lib/types";
import { PartnerEnrollmentActivitySection } from "@/ui/activity-logs/partner-enrollment-activity-section";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { Dispatch, SetStateAction, useState } from "react";

interface PartnerEnrollmentHistorySheetProps {
  partner: Pick<EnrolledPartnerExtendedProps, "id">;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function PartnerEnrollmentHistorySheetContent({
  partner,
}: Omit<PartnerEnrollmentHistorySheetProps, "isOpen">) {
  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Partner history
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
        <PartnerEnrollmentActivitySection partnerId={partner.id} />
      </div>
    </div>
  );
}

export function PartnerEnrollmentHistorySheet({
  isOpen,
  ...rest
}: PartnerEnrollmentHistorySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <PartnerEnrollmentHistorySheetContent {...rest} />
    </Sheet>
  );
}

export function usePartnerEnrollmentHistorySheet({
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
        }
      : undefined,
    enabled: !!partner?.id,
  });

  return {
    hasActivityLogs: (activityLogs?.length ?? 0) > 0,
    partnerEnrollmentHistorySheet: partner ? (
      <PartnerEnrollmentHistorySheet
        partner={partner}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    ) : null,
    setIsOpen,
  };
}
