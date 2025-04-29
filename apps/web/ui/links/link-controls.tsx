import { getQRAsCanvas, getQRAsSVGDataUri, getQRData } from "@/lib/qr";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useCheckFolderPermission } from "@/lib/swr/use-folder-permissions";
import useFolders from "@/lib/swr/use-folders";
import useWorkspace from "@/lib/swr/use-workspace";
import { QRLinkProps } from "@/lib/types.ts";
import { useArchiveLinkModal } from "@/ui/modals/archive-link-modal";
import { useDeleteLinkModal } from "@/ui/modals/delete-link-modal";
import { Download } from "@/ui/shared/icons";
import {
  Button,
  CardList,
  IconMenu,
  PenWriting,
  Photo,
  Popover,
  useCopyToClipboard,
  useKeyboardShortcut,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import { BoxArchive, FolderBookmark, QRCode } from "@dub/ui/icons";
import { cn, isDubDomain, nanoid, punycode } from "@dub/utils";
import { Delete } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import {
  PropsWithChildren,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLinkBuilder } from "../modals/link-builder";
import { QRCodeDesign, useLinkQRModal } from "../modals/link-qr-modal";
import { useMoveLinkToFolderModal } from "../modals/move-link-to-folder-modal";
import { useTransferLinkModal } from "../modals/transfer-link-modal";
import { ThreeDots } from "../shared/icons";
import { LinksListContext, ResponseLink } from "./links-container";

export function LinkControls({ link }: { link: ResponseLink }) {
  const { flags, id: workspaceId } = useWorkspace();
  const { slug } = useParams() as { slug?: string };
  const { folders } = useFolders();
  const { hovered } = useContext(CardList.Card.Context);
  const searchParams = useSearchParams();
  const { isMobile } = useMediaQuery();

  const { openMenuLinkId, setOpenMenuLinkId } = useContext(LinksListContext);
  const openPopover = openMenuLinkId === link.id;
  const setOpenPopover = (open: boolean) => {
    setOpenMenuLinkId(open ? link.id : null);
  };

  const [copiedLinkId, copyToClipboard] = useCopyToClipboard();

  const copyLinkId = () => {
    toast.promise(copyToClipboard(link.id), {
      success: "Link ID copied!",
    });
  };

  const { setShowArchiveLinkModal, ArchiveLinkModal } = useArchiveLinkModal({
    props: link,
  });
  const { setShowTransferLinkModal, TransferLinkModal } = useTransferLinkModal({
    props: link,
  });
  const { setShowDeleteLinkModal, DeleteLinkModal } = useDeleteLinkModal({
    props: link,
  });
  const { setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props: link,
  });
  const { setShowLinkBuilder, LinkBuilder } = useLinkBuilder({
    props: link,
  });
  const { setShowMoveLinkToFolderModal, MoveLinkToFolderModal } =
    useMoveLinkToFolderModal({ link });

  const isRootLink = link.key === "_root";
  const isProgramLink = link.programId !== null;
  const folderId = link.folderId || searchParams.get("folderId");

  const [dataPersisted] = useLocalStorage<QRCodeDesign>(
    `qr-code-design-${workspaceId}`,
    {
      fgColor: "#000000",
      hideLogo: false,
    },
  );
  const [data, setData] = useState(dataPersisted);
  const qrData = useMemo(
    () =>
      link.shortLink
        ? getQRData({
            url: link.shortLink,
            fgColor: data.fgColor,
          })
        : null,
    [link, data],
  );

  // Duplicate link Modal
  const {
    id: _,
    createdAt: __,
    updatedAt: ___,
    userId: ____, // don't duplicate userId since the current user can be different
    externalId: _____, // don't duplicate externalId since it should be unique
    ...propsToDuplicate
  } = link;
  const {
    setShowLinkBuilder: setShowDuplicateLinkModal,
    LinkBuilder: DuplicateLinkModal,
  } = useLinkBuilder({
    // @ts-expect-error
    duplicateProps: {
      ...propsToDuplicate,
      key: isRootLink ? nanoid(7) : `${punycode(link.key)}-copy`,
      clicks: 0,
    },
  });

  const handleBanLink = () => {
    window.confirm(
      "Are you sure you want to ban this link? It will blacklist the domain and prevent any links from that domain from being created.",
    ) &&
      (setOpenPopover(false),
      toast.promise(
        fetch(`/api/admin/links/ban?domain=${link.domain}&key=${link.key}`, {
          method: "DELETE",
        }).then(async () => {
          await mutatePrefix("/api/admin/links");
        }),
        {
          loading: "Banning link...",
          success: "Link banned!",
          error: "Error banning link.",
        },
      ));
  };

  const canManageLink = useCheckFolderPermission(
    folderId,
    "folders.links.write",
  );

  useKeyboardShortcut(
    ["e", "d", "q", "m", "a", "t", "i", "x", "b"],
    (e) => {
      setOpenPopover(false);
      switch (e.key) {
        case "e":
          canManageLink && setShowLinkBuilder(true);
          break;
        case "d":
          canManageLink && setShowDuplicateLinkModal(true);
          break;
        case "q":
          setShowLinkQRModal(true);
          break;
        case "m":
          canManageLink && setShowMoveLinkToFolderModal(true);
          break;
        case "a":
          canManageLink && setShowArchiveLinkModal(true);
          break;
        case "t":
          canManageLink &&
            isDubDomain(link.domain) &&
            setShowTransferLinkModal(true);
          break;
        case "i":
          copyLinkId();
          break;
        case "x":
          canManageLink &&
            !isRootLink &&
            !isProgramLink &&
            setShowDeleteLinkModal(true);
          break;
        case "b":
          if (!slug) handleBanLink();
          break;
      }
    },
    {
      enabled: openPopover || (hovered && openMenuLinkId === null),
    },
  );

  return (
    <div className="flex justify-end gap-2">
      <LinkQRModal />
      <LinkBuilder />
      {/*<DuplicateLinkModal />*/}
      <ArchiveLinkModal />
      {/*<TransferLinkModal />*/}
      <DeleteLinkModal />
      {/*<MoveLinkToFolderModal />*/}
      <DownloadPopover
        qrData={qrData!}
        props={{ key: link.key, domain: link.domain, url: link.url }}
      >
        <Button
          variant="secondary"
          className={cn(
            "h-8 px-1.5 outline-none transition-all duration-200",
            "border-transparent data-[state=open]:border-neutral-200/40 data-[state=open]:ring-neutral-200/40 sm:group-hover/card:data-[state=closed]:border-neutral-200/10",
            {
              "border-border-500 border": isMobile,
            },
          )}
          icon={<Download className="h-5 w-5 shrink-0" />}
        />
      </DownloadPopover>
      <Popover
        content={
          <div className="w-full sm:w-48">
            <div className="grid gap-px p-2">
              <Button
                text="Edit"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowLinkBuilder(true);
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
              {/*<Button*/}
              {/*  text="Duplicate"*/}
              {/*  variant="outline"*/}
              {/*  onClick={() => {*/}
              {/*    setOpenPopover(false);*/}
              {/*    setShowDuplicateLinkModal(true);*/}
              {/*  }}*/}
              {/*  icon={<CopyPlus className="size-4" />}*/}
              {/*  shortcut="D"*/}
              {/*  className="h-9 px-2 font-medium"*/}
              {/*  disabledTooltip={*/}
              {/*    !canManageLink*/}
              {/*      ? "You don't have permission to duplicate this link."*/}
              {/*      : undefined*/}
              {/*  }*/}
              {/*/>*/}
              {/*<Button*/}
              {/*  text="Copy Link ID"*/}
              {/*  variant="outline"*/}
              {/*  onClick={() => copyLinkId()}*/}
              {/*  icon={*/}
              {/*    copiedLinkId ? (*/}
              {/*      <CircleCheck className="size-4" />*/}
              {/*    ) : (*/}
              {/*      <Copy className="size-4" />*/}
              {/*    )*/}
              {/*  }*/}
              {/*  shortcut="I"*/}
              {/*  className="h-9 px-2 font-medium"*/}
              {/*/>*/}
            </div>
            <div className="border-t border-neutral-200/10" />
            <div className="grid gap-px p-2">
              {flags?.linkFolders && folders && folders.length > 0 && (
                <Button
                  text="Move"
                  variant="outline"
                  shortcut="M"
                  className="h-9 px-2 font-medium"
                  icon={<FolderBookmark className="size-4 text-neutral-600" />}
                  onClick={() => {
                    setOpenPopover(false);
                    setShowMoveLinkToFolderModal(true);
                  }}
                  disabledTooltip={
                    !canManageLink
                      ? "You don't have permission to move this link to another folder."
                      : undefined
                  }
                />
              )}

              <Button
                text={link.archived ? "Unpause" : "Pause"}
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

              {/*<Button*/}
              {/*  text="Transfer"*/}
              {/*  variant="outline"*/}
              {/*  onClick={() => {*/}
              {/*    setOpenPopover(false);*/}
              {/*    setShowTransferLinkModal(true);*/}
              {/*  }}*/}
              {/*  icon={<FolderInput className="size-4" />}*/}
              {/*  shortcut="T"*/}
              {/*  className="h-9 px-2 font-medium"*/}
              {/*  disabledTooltip={*/}
              {/*    !isDubDomain(link.domain) ? (*/}
              {/*      <SimpleTooltipContent*/}
              {/*        title="Since this is a custom domain link, you can only transfer it to another workspace if you transfer the domain as well."*/}
              {/*        cta="Learn more."*/}
              {/*        href="https://dub.co/help/article/how-to-transfer-domains"*/}
              {/*      />*/}
              {/*    ) : !canManageLink ? (*/}
              {/*      "You don't have permission to transfer this link."*/}
              {/*    ) : undefined*/}
              {/*  }*/}
              {/*/>*/}

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
                disabled={isRootLink || isProgramLink}
                disabledTooltip={
                  !canManageLink
                    ? "You don't have permission to delete this link."
                    : isRootLink
                      ? "You can't delete a custom domain link. You can delete the domain instead."
                      : isProgramLink
                        ? "You can't delete a link that's part of a program."
                        : undefined
                }
              />

              {!slug && ( // this is only shown in admin mode (where there's no slug)
                <button
                  onClick={() => handleBanLink()}
                  className="group flex w-full items-center justify-between rounded-md p-2 text-left text-sm font-medium text-red-600 transition-all duration-75 hover:bg-red-600 hover:text-white"
                >
                  <IconMenu text="Ban" icon={<Delete className="size-4" />} />
                  <kbd className="hidden rounded bg-red-100 px-2 py-0.5 text-xs font-light text-red-600 transition-all duration-75 group-hover:bg-red-500 group-hover:text-white sm:inline-block">
                    B
                  </kbd>
                </button>
              )}
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
