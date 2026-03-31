import { PartnerProfileLinkProps } from "@/lib/types";
import { useDeletePartnerLinkModal } from "@/ui/modals/delete-partner-link-modal";
import { usePartnerLinkModal } from "@/ui/modals/partner-link-modal";
import { usePartnerLinkQRModal } from "@/ui/modals/partner-link-qr-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, PenWriting, Popover, useKeyboardShortcut } from "@dub/ui";
import { QRCode, Trash } from "@dub/ui/icons";
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
      key: "",
    },
  });

  const canDelete =
    !link.partnerGroupDefaultLinkId &&
    link.clicks === 0 &&
    link.leads === 0 &&
    link.saleAmount === 0;

  const { setShowDeletePartnerLinkModal, DeletePartnerLinkModal } =
    useDeletePartnerLinkModal({
      link,
      onSuccess: () => {
        setOpenPopover(false);
      },
    });

  useKeyboardShortcut(
    ["e", "q", "d", "x"],
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
        case "x":
          if (canDelete) {
            setShowDeletePartnerLinkModal(true);
          }
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
      <DeletePartnerLinkModal />
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
              <Button
                text="Delete"
                variant="danger-outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowDeletePartnerLinkModal(true);
                }}
                icon={<Trash className="size-4" />}
                shortcut="X"
                className="h-9 px-2 font-medium"
                disabled={!canDelete}
                disabledTooltip={
                  link.partnerGroupDefaultLinkId
                    ? "You cannot delete your default link."
                    : !canDelete
                      ? "You can only delete links with 0 clicks, 0 leads, and $0 in sales."
                      : undefined
                }
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
          className="h-8 border-neutral-200 px-1.5 outline-none transition-all duration-200"
          icon={<ThreeDots className="h-5 w-5 shrink-0" />}
          onClick={() => {
            setOpenPopover(!openPopover);
          }}
        />
      </Popover>
    </div>
  );
}
