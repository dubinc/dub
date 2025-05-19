import { mutatePrefix } from "@/lib/swr/mutate";
import { useCheckFolderPermission } from "@/lib/swr/use-folder-permissions";
import { ExpandedLinkProps } from "@/lib/types";
import { useArchiveLinkModal } from "@/ui/modals/archive-link-modal";
import { useDeleteLinkModal } from "@/ui/modals/delete-link-modal";
import {
  Button,
  IconMenu,
  PenWriting,
  Popover,
  SimpleTooltipContent,
  useCopyToClipboard,
  useKeyboardShortcut,
} from "@dub/ui";
import {
  BoxArchive,
  CircleCheck,
  Copy,
  FolderBookmark,
  QRCode,
} from "@dub/ui/icons";
import { cn, isDubDomain, nanoid } from "@dub/utils";
import { CopyPlus, Delete, FolderInput } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { useLinkBuilder } from "../modals/link-builder";
import { useLinkQRModal } from "../modals/link-qr-modal";
import { useMoveLinkToFolderModal } from "../modals/move-link-to-folder-modal";
import { useTransferLinkModal } from "../modals/transfer-link-modal";
import { ThreeDots } from "../shared/icons";

const OPTIONS = {
  edit: "e",
  qr: "q",
  duplicate: "d",
  id: "i",
  move: "m",
  archive: "a",
  transfer: "t",
  delete: "x",
  ban: "b",
};

export function LinkControls({
  link,
  openPopover,
  setOpenPopover,
  shortcutsEnabled,
  options = Object.keys(OPTIONS),
  onMoveSuccess,
  onTransferSuccess,
  onDeleteSuccess,
  className,
  iconClassName,
}: {
  link: ExpandedLinkProps;
  openPopover: boolean;
  setOpenPopover: (open: boolean) => void;
  shortcutsEnabled: boolean;
  options?: string[];
  onMoveSuccess?: (folderId: string | null) => void;
  onTransferSuccess?: () => void;
  onDeleteSuccess?: () => void;
  className?: string;
  iconClassName?: string;
}) {
  const router = useRouter();
  const { slug } = useParams() as { slug?: string };
  const searchParams = useSearchParams();

  const [copiedLinkId, copyToClipboard] = useCopyToClipboard();

  const copyLinkId = () => {
    toast.promise(copyToClipboard(link.id), {
      success: "Link ID copied!",
    });
  };

  const openLinkBuilder = useCallback(() => {
    router.push(`/${slug}/links/${link.domain}/${link.key}`);
  }, [router, slug, link.domain, link.key]);

  const { setShowArchiveLinkModal, ArchiveLinkModal } = useArchiveLinkModal({
    props: link,
  });
  const { setShowTransferLinkModal, TransferLinkModal } = useTransferLinkModal({
    props: link,
    onSuccess: onTransferSuccess,
  });
  const { setShowDeleteLinkModal, DeleteLinkModal } = useDeleteLinkModal({
    props: link,
    onSuccess: onDeleteSuccess,
  });
  const { setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props: link,
  });
  const { setShowMoveLinkToFolderModal, MoveLinkToFolderModal } =
    useMoveLinkToFolderModal({ link, onSuccess: onMoveSuccess });

  const isRootLink = link.key === "_root";
  const isProgramLink = link.programId !== null;
  const folderId = link.folderId || searchParams.get("folderId");

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
      key: nanoid(7),
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
    options.map((o) => OPTIONS[o]),
    (e) => {
      setOpenPopover(false);
      switch (e.key) {
        case "e":
          canManageLink && openLinkBuilder();
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
      enabled: shortcutsEnabled,
      priority: 1, // Take priority over display options
    },
  );

  return (
    <div className="flex justify-end">
      {options.includes("qr") && <LinkQRModal />}
      {options.includes("duplicate") && <DuplicateLinkModal />}
      {options.includes("archive") && <ArchiveLinkModal />}
      {options.includes("transfer") && <TransferLinkModal />}
      {options.includes("delete") && <DeleteLinkModal />}
      {options.includes("move") && <MoveLinkToFolderModal />}
      <Popover
        content={
          <div className="w-full sm:w-48">
            <div className="grid gap-px p-2">
              {options.includes("edit") && (
                <Button
                  text="Edit"
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                    openLinkBuilder();
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
              )}
              {options.includes("qr") && (
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
              )}
              {options.includes("id") && (
                <Button
                  text="Copy Link ID"
                  variant="outline"
                  onClick={() => copyLinkId()}
                  icon={
                    copiedLinkId ? (
                      <CircleCheck className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )
                  }
                  shortcut="I"
                  className="h-9 px-2 font-medium"
                />
              )}
              {options.includes("duplicate") && (
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
                  disabledTooltip={
                    !canManageLink
                      ? "You don't have permission to duplicate this link."
                      : undefined
                  }
                />
              )}
            </div>
            <div className="border-t border-neutral-200" />
            <div className="grid gap-px p-2">
              {options.includes("move") && (
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
              {options.includes("archive") && (
                <Button
                  text={link.archived ? "Unarchive" : "Archive"}
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
              )}
              {options.includes("transfer") && (
                <Button
                  text="Transfer"
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowTransferLinkModal(true);
                  }}
                  icon={<FolderInput className="size-4" />}
                  shortcut="T"
                  className="h-9 px-2 font-medium"
                  disabledTooltip={
                    !isDubDomain(link.domain) ? (
                      <SimpleTooltipContent
                        title="Since this is a custom domain link, you can only transfer it to another workspace if you transfer the domain as well."
                        cta="Learn more."
                        href="https://dub.co/help/article/how-to-transfer-domains"
                      />
                    ) : !canManageLink ? (
                      "You don't have permission to transfer this link."
                    ) : undefined
                  }
                />
              )}
              {options.includes("delete") && (
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
              )}

              {options.includes("ban") &&
                !slug && ( // this is only shown in admin mode (where there's no slug)
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
            "border-transparent data-[state=open]:border-neutral-500 sm:group-hover/card:data-[state=closed]:border-neutral-200",
            className,
          )}
          icon={<ThreeDots className={cn("size-5 shrink-0", iconClassName)} />}
          onClick={() => {
            setOpenPopover(!openPopover);
          }}
        />
      </Popover>
    </div>
  );
}
