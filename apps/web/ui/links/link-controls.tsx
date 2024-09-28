import useFolders from "@/lib/swr/use-folders";
import { useAddEditLinkModal } from "@/ui/modals/add-edit-link-modal";
import { useArchiveLinkModal } from "@/ui/modals/archive-link-modal";
import { useDeleteLinkModal } from "@/ui/modals/delete-link-modal";
import {
  Button,
  CardList,
  IconMenu,
  PenWriting,
  Popover,
  SimpleTooltipContent,
  useKeyboardShortcut,
} from "@dub/ui";
import { BoxArchive, CircleCheck, Copy, QRCode } from "@dub/ui/src/icons";
import { cn, isDubDomain, nanoid, punycode } from "@dub/utils";
import { CopyPlus, Delete, FolderInput } from "lucide-react";
import { useParams } from "next/navigation";
import { useContext, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useLinkQRModal } from "../modals/link-qr-modal";
import { useMoveLinkToFolderModal } from "../modals/move-link-to-folder-modal";
import { useTransferLinkModal } from "../modals/transfer-link-modal";
import { ThreeDots } from "../shared/icons";
import { LinksListContext, ResponseLink } from "./links-container";

export function LinkControls({ link }: { link: ResponseLink }) {
  const { slug } = useParams() as { slug?: string };
  const { folders } = useFolders();
  const { hovered } = useContext(CardList.Card.Context);

  const { openMenuLinkId, setOpenMenuLinkId } = useContext(LinksListContext);
  const openPopover = openMenuLinkId === link.id;
  const setOpenPopover = (open: boolean) => {
    setOpenMenuLinkId(open ? link.id : null);
  };

  const [copiedLinkId, setCopiedLinkId] = useState(false);

  const copyLinkId = () => {
    navigator.clipboard.writeText(link.id);
    setCopiedLinkId(true);
    toast.success("Link ID copied!");
    setTimeout(() => setCopiedLinkId(false), 3000);
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
  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal({
    props: link,
  });
  const { setShowMoveLinkToFolderModal, MoveLinkToFolderModal } =
    useMoveLinkToFolderModal({ link });

  // Duplicate link Modal
  const {
    id: _,
    createdAt: __,
    updatedAt: ___,
    userId: ____,
    ...propsToDuplicate
  } = link;
  const {
    setShowAddEditLinkModal: setShowDuplicateLinkModal,
    AddEditLinkModal: DuplicateLinkModal,
  } = useAddEditLinkModal({
    // @ts-expect-error
    duplicateProps: {
      ...propsToDuplicate,
      key: link.key === "_root" ? nanoid(7) : `${punycode(link.key)}-copy`,
      clicks: 0,
    },
  });

  useKeyboardShortcut(
    ["e", "d", "q", "m", "a", "t", "i", "x"],
    (e) => {
      setOpenPopover(false);
      switch (e.key) {
        case "e":
          setShowAddEditLinkModal(true);
          break;
        case "d":
          setShowDuplicateLinkModal(true);
          break;
        case "q":
          setShowLinkQRModal(true);
          break;
        case "m":
          setShowMoveLinkToFolderModal(true);
          break;
        case "a":
          setShowArchiveLinkModal(true);
          break;
        case "t":
          if (isDubDomain(link.domain)) setShowTransferLinkModal(true);
          break;
        case "i":
          copyLinkId();
          break;
        case "x":
          setShowDeleteLinkModal(true);
          break;
      }
    },
    {
      enabled: openPopover || (hovered && openMenuLinkId === null),
    },
  );

  return (
    <div className="flex justify-end">
      <LinkQRModal />
      <AddEditLinkModal />
      <DuplicateLinkModal />
      <ArchiveLinkModal />
      <TransferLinkModal />
      <DeleteLinkModal />
      <MoveLinkToFolderModal />
      <Popover
        content={
          <div className="w-full sm:w-48">
            <div className="grid gap-px p-2">
              <Button
                text="Edit"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowAddEditLinkModal(true);
                }}
                icon={<PenWriting className="h-4 w-4" />}
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
                icon={<QRCode className="h-4 w-4" />}
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
                icon={<CopyPlus className="h-4 w-4" />}
                shortcut="D"
                className="h-9 px-2 font-medium"
              />
              <Button
                text="Copy Link ID"
                variant="outline"
                onClick={() => copyLinkId()}
                icon={
                  copiedLinkId ? (
                    <CircleCheck className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )
                }
                shortcut="I"
                className="h-9 px-2 font-medium"
              />
            </div>
            <div className="border-t border-gray-200" />
            <div className="grid gap-px p-2">
              {folders && folders.length > 0 && (
                <Button
                  text="Move"
                  variant="outline"
                  shortcut="M"
                  className="h-9 px-2 font-medium"
                  icon={<BoxArchive className="h-4 w-4" />}
                  onClick={() => {
                    setOpenPopover(false);
                    setShowMoveLinkToFolderModal(true);
                  }}
                />
              )}

              <Button
                text={link.archived ? "Unarchive" : "Archive"}
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowArchiveLinkModal(true);
                }}
                icon={<BoxArchive className="h-4 w-4" />}
                shortcut="A"
                className="h-9 px-2 font-medium"
              />
              <Button
                text="Transfer"
                variant="outline"
                onClick={() => {
                  setOpenPopover(false);
                  setShowTransferLinkModal(true);
                }}
                icon={<FolderInput className="h-4 w-4" />}
                shortcut="T"
                className="h-9 px-2 font-medium"
                {...(!isDubDomain(link.domain) && {
                  disabledTooltip: (
                    <SimpleTooltipContent
                      title="Since this is a custom domain link, you can only transfer it to another workspace if you transfer the domain as well."
                      cta="Learn more."
                      href="https://dub.co/help/article/how-to-transfer-domains"
                    />
                  ),
                })}
              />
              {link.key !== "_root" && (
                <Button
                  text="Delete"
                  variant="danger-outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowDeleteLinkModal(true);
                  }}
                  icon={<Delete className="h-4 w-4" />}
                  shortcut="X"
                  className="h-9 px-2 font-medium"
                />
              )}
              {!slug && ( // this is only shown in admin mode (where there's no slug)
                <button
                  onClick={() => {
                    window.confirm(
                      "Are you sure you want to ban this link? It will blacklist the domain and prevent any links from that domain from being created.",
                    ) &&
                      (setOpenPopover(false),
                      toast.promise(
                        fetch(`/api/admin/links/ban?key=${link.key}`, {
                          method: "DELETE",
                        }).then(async () => {
                          await mutate(
                            (key) =>
                              typeof key === "string" &&
                              key.startsWith("/api/admin/links/ban"),
                            undefined,
                            { revalidate: true },
                          );
                        }),
                        {
                          loading: "Banning link...",
                          success: "Link banned!",
                          error: "Error banning link.",
                        },
                      ));
                  }}
                  className="group flex w-full items-center justify-between rounded-md p-2 text-left text-sm font-medium text-red-600 transition-all duration-75 hover:bg-red-600 hover:text-white"
                >
                  <IconMenu text="Ban" icon={<Delete className="h-4 w-4" />} />
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
            "border-transparent data-[state=open]:border-gray-500 sm:group-hover/card:data-[state=closed]:border-gray-200",
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
