"use client";

import type { PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Sheet,
  useRouterStuff,
} from "@dub/ui";
import { NetworkPartnerDetailContent } from "./[partnerId]/page-client";

type NetworkPartnerDetailSheetProps = {
  isOpen: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  partnerId: string;
  partnerStatus: string;
  searchPartner?: PartnerContentSearchPartner;
  setIsOpen: (open: boolean) => void;
};

export function NetworkPartnerDetailSheet({
  isOpen,
  onNext,
  onPrevious,
  partnerId,
  partnerStatus,
  searchPartner,
  setIsOpen,
}: NetworkPartnerDetailSheetProps) {
  const { queryParams } = useRouterStuff();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
      onClose={() => queryParams({ del: "partnerId" })}
      contentProps={{
        className: "md:w-[max(min(calc(100vw-334px),1170px),540px)]",
      }}
    >
      <div className="flex size-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Partner network
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

        <div className="scrollbar-hide min-h-0 grow overflow-y-auto p-4 sm:p-6">
          <NetworkPartnerDetailContent
            partnerId={partnerId}
            partnerStatus={partnerStatus}
            searchPartner={searchPartner}
            nestedSheets
          />
        </div>
      </div>
    </Sheet>
  );
}
