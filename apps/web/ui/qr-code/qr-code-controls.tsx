import { useCheckFolderPermission } from "@/lib/swr/use-folder-permissions";
import { useArchiveQRModal } from "@/ui/modals/archive-qr-modal.tsx";
import { useDeleteQRModal } from "@/ui/modals/delete-qr-modal.tsx";
import { useQRBuilder } from "@/ui/modals/qr-builder";
import { useQrCustomization } from "@/ui/qr-builder/hooks/use-qr-customization";
import {
  QrCodesListContext,
  ResponseQrCode,
} from "@/ui/qr-code/qr-codes-container.tsx";
import { useQrDownload } from "@/ui/qr-code/use-qr-download";
import {
  Button,
  CardList,
  PenWriting,
  Photo,
  Popover,
  useKeyboardShortcut,
} from "@dub/ui";
import { BoxArchive, Download } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Delete } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PropsWithChildren, useContext, useState } from "react";
import { ThreeDots } from "../shared/icons";

interface QrCodeControlsProps {
  qrCode: ResponseQrCode;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export function QrCodeControls({ qrCode, canvasRef }: QrCodeControlsProps) {
  const { hovered } = useContext(CardList.Card.Context);
  const searchParams = useSearchParams();

  const { openMenuQrCodeId, setOpenMenuQrCodeId } =
    useContext(QrCodesListContext);
  const openPopover = openMenuQrCodeId === qrCode.id;
  const setOpenPopover = (open: boolean) => {
    setOpenMenuQrCodeId(open ? qrCode.id : null);
  };

  const { setShowArchiveQRModal, ArchiveQRModal } = useArchiveQRModal({
    props: qrCode,
  });
  const { setShowDeleteQRModal, DeleteLinkModal } = useDeleteQRModal({
    props: qrCode,
  });

  const { setShowQRBuilderModal, QRBuilderModal } = useQRBuilder({
    props: qrCode,
  });

  const folderId = qrCode.link.folderId || searchParams.get("folderId");

  const canManageLink = useCheckFolderPermission(
    folderId,
    "folders.links.write",
  );

  useKeyboardShortcut(
    ["e", "a", "x", "b"],
    (e) => {
      setOpenPopover(false);
      switch (e.key) {
        case "e":
          canManageLink && setShowQRBuilderModal(true);
          break;
        case "a":
          canManageLink && setShowArchiveQRModal(true);
          break;
        case "x":
          canManageLink && setShowDeleteQRModal(true);
          break;
      }
    },
    {
      enabled: openPopover || (hovered && openMenuQrCodeId === null),
    },
  );

  return (
    <div className="flex justify-end gap-2">
      <QRBuilderModal />
      <ArchiveQRModal />
      <DeleteLinkModal />
      {canvasRef && (
        <DownloadPopover qrCode={qrCode} canvasRef={canvasRef}>
          <Button
            variant="secondary"
            className={cn(
              "h-8 px-1.5 outline-none transition-all duration-200",
              "border-transparent data-[state=open]:border-neutral-200/40 data-[state=open]:ring-neutral-200/40 sm:group-hover/card:data-[state=closed]:border-neutral-200/10",
              "border-border-500 border md:border-none",
            )}
            icon={<Download className="h-5 w-5 shrink-0" />}
          />
        </DownloadPopover>
      )}
      <Popover
        content={
          <div className="w-full sm:w-48">
            <div className="grid gap-px p-2">
              <Button
                text="Edit"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowQRBuilderModal(true);
                }}
                icon={<PenWriting className="size-4" />}
                shortcut="E"
                className="h-9 px-2 font-medium"
                disabledTooltip={
                  !canManageLink
                    ? "You don't have permission to update this link."
                    : undefined
                }
              />
            </div>
            <div className="border-t border-neutral-200/10" />
            <div className="grid gap-px p-2">
              <Button
                text={qrCode.link.archived ? "Unpause" : "Pause"}
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowArchiveQRModal(true);
                }}
                icon={<BoxArchive className="size-4" />}
                shortcut="A"
                className="h-9 px-2 font-medium"
                disabledTooltip={
                  !canManageLink
                    ? "You don't have permission to archive this link."
                    : undefined
                }
              />

              <Button
                text="Delete"
                variant="danger-outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowDeleteQRModal(true);
                }}
                icon={<Delete className="size-4" />}
                shortcut="X"
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
            "border-transparent data-[state=open]:border-neutral-200/40 data-[state=open]:ring-neutral-200/40 sm:group-hover/card:data-[state=closed]:border-neutral-200/10",
            "border-border-500 border md:border-none",
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

function DownloadPopover({
  qrCode,
  canvasRef,
  children,
}: PropsWithChildren<{
  qrCode: ResponseQrCode;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}>) {
  const [openPopover, setOpenPopover] = useState(false);
  const { qrCode: qrCodeObject } = useQrCustomization(qrCode);
  const { downloadQrCode } = useQrDownload(qrCodeObject, canvasRef);

  return (
    <Popover
      content={
        <div className="grid p-1 sm:min-w-48">
          <button
            className="flex items-center gap-2 rounded-md p-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            onClick={() => {
              downloadQrCode("svg");
              setOpenPopover(false);
            }}
          >
            <Photo className="h-4 w-4" />
            <span>Download SVG</span>
          </button>
          <button
            className="flex items-center gap-2 rounded-md p-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            onClick={() => {
              downloadQrCode("png");
              setOpenPopover(false);
            }}
          >
            <Photo className="h-4 w-4" />
            <span>Download PNG</span>
          </button>
          <button
            className="flex items-center gap-2 rounded-md p-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            onClick={() => {
              downloadQrCode("jpg");
              setOpenPopover(false);
            }}
          >
            <Photo className="h-4 w-4" />
            <span>Download JPG</span>
          </button>
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      {children}
    </Popover>
  );
}
