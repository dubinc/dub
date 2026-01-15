import { PartnerProfileReferral } from "@/lib/zod/schemas/partner-profile";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Sheet,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import { Dispatch, SetStateAction } from "react";
import { ReferralDetails } from "./referral-details";
import { ReferralLeadDetails } from "./referral-lead-details";

type PartnerProfileReferralSheetProps = {
  referral: PartnerProfileReferral;
  onNext?: () => void;
  onPrevious?: () => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PartnerProfileReferralSheetContent({
  referral,
  onPrevious,
  onNext,
}: Omit<PartnerProfileReferralSheetProps, "setIsOpen">) {
  // right arrow key onNext
  useKeyboardShortcut(
    "ArrowRight",
    () => {
      if (onNext) {
        onNext();
      }
    },
    { sheet: true },
  );

  // left arrow key onPrevious
  useKeyboardShortcut(
    "ArrowLeft",
    () => {
      if (onPrevious) {
        onPrevious();
      }
    },
    { sheet: true },
  );

  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Referral details
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

      <div className="@3xl/sheet:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] scrollbar-hide grid min-h-0 grow grid-cols-1 gap-x-6 gap-y-2 overflow-y-auto p-4 sm:gap-y-4 sm:p-6">
        {/* Left side - Referral details */}
        <ReferralDetails referral={{ formData: referral.formData }} />

        {/* Right side - Customer details */}
        <div className="@3xl/sheet:order-2 flex flex-col gap-2 sm:gap-4">
          <ReferralLeadDetails referral={referral} />
        </div>
      </div>
    </div>
  );
}

export function PartnerProfileReferralSheet({
  isOpen,
  nested,
  ...rest
}: PartnerProfileReferralSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "referralId", scroll: false })}
      nested={nested}
      contentProps={{
        // 540px - 1170px width based on viewport
        className: "md:w-[max(min(calc(100vw-334px),1170px),540px)]",
      }}
    >
      <PartnerProfileReferralSheetContent {...rest} />
    </Sheet>
  );
}
