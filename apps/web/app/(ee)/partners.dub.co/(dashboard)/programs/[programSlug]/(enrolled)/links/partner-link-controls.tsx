import { PartnerProfileLinkProps } from "@/lib/types";
import { usePartnerLinkModal } from "@/ui/modals/partner-link-modal";
import { usePartnerLinkQRModal } from "@/ui/modals/partner-link-qr-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, PenWriting, Popover, useKeyboardShortcut } from "@dub/ui";
import { QRCode } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { CopyPlus } from "lucide-react";

export function PartnerLinkControls({
  link,
  openPopover,
  setOpenPopover,
  shortcutsEnabled,
}: {
  link: PartnerProfileLinkProps;
  openPopover: boolean;
  setOpenPopover: (open: boolean) => void;
  shortcutsEnabled: boolean;
}) {
  const { setShowPartnerLinkModal, PartnerLinkModal } = usePartnerLinkModal({
    link,
  });

  const { setShowLinkQRModal, LinkQRModal } = usePartnerLinkQRModal({
    props: {
      domain: link.domain,
      key: link.key,
    },
  });

  const {
    setShowPartnerLinkModal: setShowDuplicateLinkModal,
    PartnerLinkModal: DuplicateLinkModal,
  } = usePartnerLinkModal({
    link: {
      ...link,
      id: "",
    },
  });

  useKeyboardShortcut(
    ["e", "q", "d"],
    (e) => {
      setOpenPopover(false);
      switch (e.key) {
        case "e":
          setShowPartnerLinkModal(true);
          break;
        case "q":
          setShowLinkQRModal(true);
          break;
        case "d":
          setShowDuplicateLinkModal(true);
          break;
      }
    },
    {
      enabled: shortcutsEnabled,
      priority: 1,
    },
  );

  return (
    <div className="flex justify-end">
      <LinkQRModal />
      <PartnerLinkModal />
      <DuplicateLinkModal />
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
                shortcut="E"
                className="h-9 px-2 font-medium"
              />
              <Button
                text="QR Code"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowLinkQRModal(true);
                }}
                icon={<QRCode className="size-4" />}
                shortcut="Q"
                className="h-9 px-2 font-medium"
              />
              <Button
                text="Duplicate"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowDuplicateLinkModal(true);
                }}
                icon={<CopyPlus className="size-4" />}
                shortcut="D"
                className="h-9 px-2 font-medium"
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
