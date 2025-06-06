import { mutatePrefix } from "@/lib/swr/mutate.ts";
import { useCheckFolderPermission } from "@/lib/swr/use-folder-permissions";
import useWorkspace from "@/lib/swr/use-workspace.ts";
import {
  sendArchiveRequest,
  useArchiveQRModal,
} from "@/ui/modals/archive-qr-modal.tsx";
import { useDeleteQRModal } from "@/ui/modals/delete-qr-modal.tsx";
import { useQRBuilder } from "@/ui/modals/qr-builder";
import { useQrCustomization } from "@/ui/qr-builder/hooks/use-qr-customization";
import {
  QrCodesListContext,
  ResponseQrCode,
} from "@/ui/qr-code/qr-codes-container.tsx";
import { useQrDownload } from "@/ui/qr-code/use-qr-download";
import { Button, CardList, Photo, Popover, useKeyboardShortcut } from "@dub/ui";
import { BoxArchive, Download } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Delete, Palette, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PropsWithChildren, RefObject, useContext, useState } from "react";
import { toast } from "sonner";
import { ThreeDots } from "../shared/icons";

interface QrCodeControlsProps {
  qrCode: ResponseQrCode;
  canvasRef?: RefObject<HTMLCanvasElement>;
  isTrialOver?: boolean;
  setShowTrialExpiredModal?: (show: boolean) => void;
}

export function QrCodeControls({
  qrCode,
  canvasRef,
  isTrialOver,
  setShowTrialExpiredModal,
}: QrCodeControlsProps) {
  const { id: workspaceId } = useWorkspace();
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

  const {
    setShowQRBuilderModal: setShowQREditModal,
    QRBuilderModal: QREditModal,
  } = useQRBuilder({
    props: qrCode,
  });

  const {
    setShowQRBuilderModal: setShowQRTypeModal,
    QRBuilderModal: QRTypeModal,
  } = useQRBuilder({
    props: qrCode,
    initialStep: 1, // Этап выбора типа QR кода
  });

  const {
    setShowQRBuilderModal: setShowQRCustomizeModal,
    QRBuilderModal: QRCustomizeModal,
  } = useQRBuilder({
    props: qrCode,
    initialStep: 3, // Этап кастомизации дизайна
  });

  const [archiving, setArchiving] = useState<boolean>(false);

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
          canManageLink && setShowQREditModal(true);
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
    <div className="flex flex-col-reverse items-end justify-end gap-2 lg:flex-row lg:items-center">
      <QREditModal />
      <QRTypeModal />
      <QRCustomizeModal />
      <ArchiveQRModal />
      <DeleteLinkModal />
      {canvasRef && (
        <DownloadPopover
          qrCode={qrCode}
          canvasRef={canvasRef}
          isTrialOver={isTrialOver}
          setShowTrialExpiredModal={setShowTrialExpiredModal}
        >
          <Button
            variant="secondary"
            className={cn(
              "h-8 w-8 px-1.5 outline-none transition-all duration-200",
              "border-transparent data-[state=open]:border-neutral-200/40 data-[state=open]:ring-neutral-200/40 sm:group-hover/card:data-[state=closed]:border-neutral-200/10",
              "border-border-500 border lg:border-none",
            )}
            icon={<Download className="h-5 w-5 shrink-0" />}
          />
        </DownloadPopover>
      )}
      <Popover
        content={
          <div className="w-full sm:w-48">
            <div className="grid gap-1 p-2">
              {/*<Button*/}
              {/*  text="Edit"*/}
              {/*  variant="outline"*/}
              {/*  onClick={() => {*/}
              {/*    setOpenPopover(false);*/}
              {/*    setShowQREditModal(true);*/}
              {/*  }}*/}
              {/*  icon={<PenWriting className="size-4" />}*/}
              {/*  shortcut="E"*/}
              {/*  className="h-9 px-2 font-medium justify-start w-full"*/}
              {/*  disabledTooltip={*/}
              {/*    !canManageLink*/}
              {/*      ? "You don't have permission to update this link."*/}
              {/*      : undefined*/}
              {/*  }*/}
              {/*/>*/}
              <Button
                text="Change QR Type"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  if (isTrialOver) {
                    setShowTrialExpiredModal?.(true);
                    return;
                  }
                  setShowQRTypeModal(true);
                }}
                icon={<RefreshCw className="size-4" />}
                className="h-9 w-full justify-start px-2 font-medium"
                disabledTooltip={
                  !canManageLink
                    ? "You don't have permission to update this link."
                    : undefined
                }
              />
              <Button
                text="Customize QR"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);

                  if (isTrialOver) {
                    setShowTrialExpiredModal?.(true);
                    return;
                  }

                  setShowQRCustomizeModal(true);
                }}
                icon={<Palette className="size-4" />}
                className="h-9 w-full justify-start px-2 font-medium"
                disabledTooltip={
                  !canManageLink
                    ? "You don't have permission to update this link."
                    : undefined
                }
              />
            </div>
            <div className="border-t border-neutral-200/10" />
            <div className="grid gap-1 p-2">
              <Button
                text={qrCode.link.archived ? "Unpause" : "Pause"}
                variant="outline"
                onClick={async () => {
                  setArchiving(true);
                  const res = await sendArchiveRequest({
                    qrId: qrCode.id,
                    archive: !qrCode.link.archived,
                    workspaceId,
                  });

                  if (!res.ok) {
                    const { error } = await res.json();
                    toast.error(error.message);
                    setArchiving(false);
                    return;
                  }

                  mutatePrefix(["/api/qrs", "/api/links"]);
                  toast.success(
                    `Successfully ${qrCode.link.archived ? "unpaused" : "paused"} QR code!`,
                  );
                  setOpenPopover(false);
                  setArchiving(false);
                }}
                icon={<BoxArchive className="size-4" />}
                shortcut="A"
                className="h-9 w-full justify-start px-2 font-medium"
                disabledTooltip={
                  !canManageLink
                    ? "You don't have permission to archive this link."
                    : undefined
                }
                loading={archiving}
              />

              <Button
                text="Delete"
                variant="danger-outline"
                onClick={() => {
                  setOpenPopover(false);

                  if (isTrialOver) {
                    setShowTrialExpiredModal?.(true);
                    return;
                  }

                  setShowDeleteQRModal(true);
                }}
                icon={<Delete className="size-4" />}
                shortcut="X"
                className="h-9 w-full justify-start px-2 font-medium"
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
            "h-8 w-8 px-1.5 outline-none transition-all duration-200",
            "border-transparent data-[state=open]:border-neutral-200/40 data-[state=open]:ring-neutral-200/40 sm:group-hover/card:data-[state=closed]:border-neutral-200/10",
            "border-border-500 border lg:border-none",
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
  isTrialOver = false,
  setShowTrialExpiredModal,
  children,
}: PropsWithChildren<{
  qrCode: ResponseQrCode;
  canvasRef: RefObject<HTMLCanvasElement>;
  isTrialOver?: boolean;
  setShowTrialExpiredModal?: (show: boolean) => void;
}>) {
  const [openPopover, setOpenPopover] = useState(false);
  const { qrCode: qrCodeObject } = useQrCustomization(qrCode);
  const { downloadQrCode } = useQrDownload(qrCodeObject, canvasRef);

  return (
    <Popover
      content={
        <div className="grid gap-1 p-2 sm:min-w-48">
          <button
            className="flex w-full items-center justify-start gap-2 rounded-md p-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            onClick={() => {
              downloadQrCode("svg");
              setOpenPopover(false);
            }}
          >
            <Photo className="h-4 w-4" />
            <span>Download SVG</span>
          </button>
          <button
            className="flex w-full items-center justify-start gap-2 rounded-md p-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            onClick={() => {
              downloadQrCode("png");
              setOpenPopover(false);
            }}
          >
            <Photo className="h-4 w-4" />
            <span>Download PNG</span>
          </button>
          <button
            className="flex w-full items-center justify-start gap-2 rounded-md p-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
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
      setOpenPopover={() => {
        if (isTrialOver) {
          setShowTrialExpiredModal?.(true);
          return;
        }

        setOpenPopover(!openPopover);
      }}
    >
      {children}
    </Popover>
  );
}
