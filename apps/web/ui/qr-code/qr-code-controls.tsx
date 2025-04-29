import { getQRAsCanvas, getQRAsSVGDataUri, getQRData } from "@/lib/qr";
import { useCheckFolderPermission } from "@/lib/swr/use-folder-permissions";
import { QRLinkProps } from "@/lib/types.ts";
import { useArchiveLinkModal } from "@/ui/modals/archive-link-modal";
import { useDeleteLinkModal } from "@/ui/modals/delete-link-modal";
import { useQRBuilder } from "@/ui/modals/qr-builder";
import {
  NewResponseQrCode,
  QrCodesListContext,
} from "@/ui/qr-code/qr-codes-container.tsx";
import {
  Button,
  CardList,
  IconMenu,
  PenWriting,
  Photo,
  Popover,
  useKeyboardShortcut,
} from "@dub/ui";
import { BoxArchive } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Delete } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PropsWithChildren, useContext, useRef, useState } from "react";
import { ThreeDots } from "../shared/icons";

export function QrCodeControls({ qrCode }: { qrCode: NewResponseQrCode }) {
  const { hovered } = useContext(CardList.Card.Context);
  const searchParams = useSearchParams();

  const { openMenuQrCodeId, setOpenMenuQrCodeId } =
    useContext(QrCodesListContext);
  const openPopover = openMenuQrCodeId === qrCode.id;
  const setOpenPopover = (open: boolean) => {
    setOpenMenuQrCodeId(open ? qrCode.id : null);
  };

  // TODO: RELEASE change useArchiveLinkModal to useArchiveQrModal
  const { setShowArchiveLinkModal, ArchiveLinkModal } = useArchiveLinkModal({
    props: qrCode.link,
  });
  // TODO: RELEASE change useDeleteLinkModal to useDeleteQrModal
  const { setShowDeleteLinkModal, DeleteLinkModal } = useDeleteLinkModal({
    props: qrCode.link,
  });
  // TODO: RELEASE add qr props to edit him
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
          canManageLink && setShowArchiveLinkModal(true);
          break;
        case "x":
          canManageLink && setShowDeleteLinkModal(true);
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
      <ArchiveLinkModal />
      <DeleteLinkModal />
      {/* TODO: RELEASE add download popover */}
      {/*<DownloadPopover*/}
      {/*  qrData={qrData!}*/}
      {/*  props={{ key: link.key, domain: link.domain, url: link.url }}*/}
      {/*>*/}
      {/*  <Button*/}
      {/*    variant="secondary"*/}
      {/*    className={cn(*/}
      {/*      "h-8 px-1.5 outline-none transition-all duration-200",*/}
      {/*      "border-transparent data-[state=open]:border-neutral-200/40 data-[state=open]:ring-neutral-200/40 sm:group-hover/card:data-[state=closed]:border-neutral-200/10",*/}
      {/*    )}*/}
      {/*    icon={<Download className="h-5 w-5 shrink-0" />}*/}
      {/*  />*/}
      {/*</DownloadPopover>*/}
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
                  setShowArchiveLinkModal(true);
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
                  setShowDeleteLinkModal(true);
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

// @USEFUL_FEATURE: copy of qr download implementation from link-qr-modal.tsx
function DownloadPopover({
  qrData,
  props,
  children,
}: PropsWithChildren<{
  qrData: ReturnType<typeof getQRData>;
  props: QRLinkProps;
}>) {
  const anchorRef = useRef<HTMLAnchorElement>(null);

  function download(url: string, extension: string) {
    if (!anchorRef.current) return;
    anchorRef.current.href = url;
    anchorRef.current.download = `${props.key}-qrcode.${extension}`;
    anchorRef.current.click();
    setOpenPopover(false);
  }

  const [openPopover, setOpenPopover] = useState(false);

  return (
    <div>
      <Popover
        content={
          <div className="grid p-1 sm:min-w-48">
            <button
              type="button"
              onClick={async () => {
                download(await getQRAsSVGDataUri(qrData), "svg");
              }}
              className="rounded-md p-2 text-left text-sm font-medium text-neutral-500 transition-all duration-75 hover:bg-neutral-100"
            >
              <IconMenu
                text="Download SVG"
                icon={<Photo className="h-4 w-4" />}
              />
            </button>
            <button
              type="button"
              onClick={async () => {
                download(
                  (await getQRAsCanvas(qrData, "image/png")) as string,
                  "png",
                );
              }}
              className="rounded-md p-2 text-left text-sm font-medium text-neutral-500 transition-all duration-75 hover:bg-neutral-100"
            >
              <IconMenu
                text="Download PNG"
                icon={<Photo className="h-4 w-4" />}
              />
            </button>
            <button
              type="button"
              onClick={async () => {
                download(
                  (await getQRAsCanvas(qrData, "image/jpeg")) as string,
                  "jpg",
                );
              }}
              className="rounded-md p-2 text-left text-sm font-medium text-neutral-500 transition-all duration-75 hover:bg-neutral-100"
            >
              <IconMenu
                text="Download JPEG"
                icon={<Photo className="h-4 w-4" />}
              />
            </button>
          </div>
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        {children}
      </Popover>
      {/* This will be used to prompt downloads. */}
      <a
        className="hidden"
        download={`${props.key}-qrcode.svg`}
        ref={anchorRef}
      />
    </div>
  );
}
