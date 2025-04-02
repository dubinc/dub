import { PartnerProfileLinkProps } from "@/lib/types";
import { usePartnerLinkModal } from "@/ui/modals/partner-link-modal";
import { usePartnerLinkQRModal } from "@/ui/modals/partner-link-qr-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, PenWriting, Popover } from "@dub/ui";
import { QRCode } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useState } from "react";

// this is unused for now
// at least until we have more controls available for partner links
export function PartnerLinkControls({
  link,
  programId,
}: {
  link: PartnerProfileLinkProps;
  programId: string;
}) {
  const { setShowPartnerLinkModal, PartnerLinkModal } = usePartnerLinkModal({
    link,
  });

  const { setShowLinkQRModal, LinkQRModal } = usePartnerLinkQRModal({
    props: {
      domain: link.domain,
      key: link.key,
    },
    programId: programId,
  });

  const [openPopover, setOpenPopover] = useState(false);

  return (
    <div className="flex justify-end">
      <LinkQRModal />
      <PartnerLinkModal />
      <Popover
        content={
          <div className="w-full sm:w-48">
            <div className="grid gap-px p-2">
              <Button
                text="Edit"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowPartnerLinkModal(true);
                }}
                icon={<PenWriting className="size-4" />}
                className="h-9 justify-start px-2 font-medium"
              />
              <Button
                text="QR Code"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowLinkQRModal(true);
                }}
                icon={<QRCode className="size-4" />}
                className="h-9 justify-start px-2 font-medium"
              />
            </div>
          </div>
        }
        align="end"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <Button
          variant="secondary"
          className={cn(
            "h-8 px-1.5 outline-none transition-all duration-200",
            "border-transparent data-[state=open]:border-neutral-500 sm:group-hover/card:data-[state=closed]:border-neutral-200",
          )}
          icon={<ThreeDots className="h-5 w-5 shrink-0" />}
          onClick={() => {
            setOpenPopover(!openPopover);
          }}
        />
      </Popover>
    </div>
  );
}
