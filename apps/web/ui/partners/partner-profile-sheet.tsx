import { EnrolledPartnerProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { Dispatch, SetStateAction } from "react";
import { PartnerAbout } from "./partner-about";
import { PartnerApplicationDetails } from "./partner-application-details";

type PartnerProfileSheetProps = {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PartnerProfileSheetContent({ partner }: PartnerProfileSheetProps) {
  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Partner profile
        </Sheet.Title>
        <div className="flex items-center gap-4">
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      <div className="scrollbar-hide min-h-0 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 text-sm text-neutral-600">
          <h3 className="text-content-emphasis text-lg font-semibold">About</h3>
          <PartnerAbout partner={partner} />

          {partner.applicationId && (
            <div className="border-border-subtle border-t pt-6">
              <h3 className="text-content-emphasis mb-6 text-lg font-semibold">
                Application
              </h3>
              <PartnerApplicationDetails
                applicationId={partner.applicationId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PartnerProfileSheet({
  isOpen,
  nested,
  ...rest
}: PartnerProfileSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <PartnerProfileSheetContent {...rest} />
    </Sheet>
  );
}
