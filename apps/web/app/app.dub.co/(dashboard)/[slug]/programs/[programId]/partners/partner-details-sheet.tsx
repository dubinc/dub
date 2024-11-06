import { EnrolledPartnerProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

function PartnerDetailsSheetContent({
  partner,
  setIsOpen,
}: {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Partner details
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-3 text-sm">WIP</div>
        </div>
        <div className="p-6 pt-2"></div>
      </div>
      {partner.status !== "approved" && (
        <div className="flex grow flex-col justify-end">
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                toast.info("WIP");
                setIsOpen(false);
              }}
              text="Decline"
              className="w-fit"
            />
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                toast.info("WIP");
                setIsOpen(false);
              }}
              text="Approve"
            />
          </div>
        </div>
      )}
    </>
  );
}

export function PartnerDetailsSheet({
  isOpen,
  setIsOpen,
  partner,
}: {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  partner?: EnrolledPartnerProps;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {partner && (
        <PartnerDetailsSheetContent partner={partner} setIsOpen={setIsOpen} />
      )}
    </Sheet>
  );
}
