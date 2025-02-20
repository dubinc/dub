import { useFolderPermissions } from "@/lib/swr/use-folder-permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  BoxArchive,
  Button,
  CircleDollar,
  Folder,
  Icon,
  LoadingSpinner,
  PaginationControls,
  Popover,
  Tag,
  TooltipContent,
  Trash,
  useKeyboardShortcut,
  usePagination,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { memo, ReactNode, useContext, useMemo, useState } from "react";
import { useArchiveLinkModal } from "../modals/archive-link-modal";
import { useDeleteLinkModal } from "../modals/delete-link-modal";
import { useLinkConversionTrackingModal } from "../modals/link-conversion-tracking-modal";
import { useMoveLinkToFolderModal } from "../modals/move-link-to-folder-modal";
import { useTagLinkModal } from "../modals/tag-link-modal";
import { ThreeDots, X } from "../shared/icons";
import ArchivedLinksHint from "./archived-links-hint";
import { useLinkSelection } from "./link-selection-provider";
import { LinksListContext, ResponseLink } from "./links-container";

type BulkAction = {
  label: string;
  icon: Icon;
  action: () => void;
  disabledTooltip?: string | ReactNode;
  keyboardShortcut?: string;
};

export const LinksToolbar = memo(
  ({
    loading,
    links,
    linksCount,
  }: {
    loading: boolean;
    links: ResponseLink[];
    linksCount: number;
  }) => {
    const { flags, slug, plan } = useWorkspace();
    const { folders } = useFolderPermissions();
    const conversionsEnabled = !!plan && plan !== "free" && plan !== "pro";

    const { openMenuLinkId } = useContext(LinksListContext);
    const { selectedLinkIds, setSelectedLinkIds } = useLinkSelection();
    const { pagination, setPagination } = usePagination();

    const selectedLinks = useMemo(
      () => links.filter(({ id }) => selectedLinkIds.includes(id)),
      [links, selectedLinkIds],
    );

    const hasAllFolderPermissions = useMemo(() => {
      if (!folders || !Array.isArray(folders)) return false;

      return selectedLinks.every(
        (link) =>
          !link.folderId ||
          folders
            .find((folder) => folder.id === link.folderId)
            ?.permissions.includes("folders.links.write"),
      );
    }, [selectedLinks, folders]);

    const { setShowTagLinkModal, TagLinkModal } = useTagLinkModal({
      props: selectedLinks,
    });
    const { setShowMoveLinkToFolderModal, MoveLinkToFolderModal } =
      useMoveLinkToFolderModal({
        links: selectedLinks,
      });
    const { setShowLinkConversionTrackingModal, LinkConversionTrackingModal } =
      useLinkConversionTrackingModal({
        props: selectedLinks,
      });
    const { setShowArchiveLinkModal, ArchiveLinkModal } = useArchiveLinkModal({
      props: selectedLinks,
    });
    const { setShowDeleteLinkModal, DeleteLinkModal } = useDeleteLinkModal({
      props: selectedLinks,
    });

    const bulkActions: BulkAction[] = useMemo(
      () => [
        {
          label: "Tags",
          icon: Tag,
          action: () => setShowTagLinkModal(true),
          keyboardShortcut: "t",
        },
        ...(flags?.linkFolders
          ? [
              {
                label: "Folder",
                icon: Folder,
                action: () => setShowMoveLinkToFolderModal(true),
                disabledTooltip:
                  plan === "free" ? (
                    <TooltipContent
                      title="You can only use Link Folders on a Pro plan and above. Upgrade to Pro to continue."
                      cta="Upgrade to Pro"
                      href={`/${slug}/upgrade`}
                    />
                  ) : undefined,
                keyboardShortcut: "m",
              },
            ]
          : []),
        {
          label: "Conversion",
          icon: CircleDollar,
          action: () => setShowLinkConversionTrackingModal(true),
          disabledTooltip: conversionsEnabled ? undefined : (
            <TooltipContent
              title="Conversion tracking is only available on Business plans and above."
              cta="Upgrade to Business"
              href={
                slug ? `/${slug}/upgrade?exit=close` : "https://dub.co/pricing"
              }
              target="_blank"
            />
          ),
          keyboardShortcut: "c",
        },
        {
          label:
            selectedLinks.length &&
            selectedLinks.every(({ archived }) => archived)
              ? "Unarchive"
              : "Archive",
          icon: BoxArchive,
          action: () => setShowArchiveLinkModal(true),
          keyboardShortcut: "a",
        },
        {
          label: "Delete",
          icon: Trash,
          action: () => setShowDeleteLinkModal(true),
          disabledTooltip: selectedLinks.some(({ programId }) => programId)
            ? "You can't delete a link that's part of a program."
            : undefined,
          keyboardShortcut: "x",
        },
      ],
      [plan, conversionsEnabled, selectedLinks],
    );

    useKeyboardShortcut(
      bulkActions
        .map(({ keyboardShortcut }) => keyboardShortcut)
        .filter(Boolean) as string[],
      (e) => {
        const action = bulkActions.find(
          ({ keyboardShortcut }) => keyboardShortcut === e.key,
        );
        if (action && !action.disabledTooltip && hasAllFolderPermissions)
          action.action();
      },
      {
        enabled: selectedLinkIds.length > 0 && openMenuLinkId === null,
        priority: 1, // Take priority over individual link controls
        modal: false,
      },
    );

    useKeyboardShortcut("Escape", () => setSelectedLinkIds([]), {
      enabled: selectedLinkIds.length > 0 && openMenuLinkId === null,
      priority: 2, // Take priority over clearing filters
      modal: false,
    });

    return (
      <>
        <TagLinkModal />
        <MoveLinkToFolderModal />
        <LinkConversionTrackingModal />
        <ArchiveLinkModal />
        <DeleteLinkModal />

        {/* Leave room at bottom of list */}
        <div className="h-[90px]" />

        <div className="fixed bottom-4 left-0 w-full sm:max-[1330px]:w-[calc(100%-150px)] md:left-[240px] md:w-[calc(100%-240px)] md:max-[1330px]:w-[calc(100%-240px-150px)]">
          <div
            className={cn(
              "relative left-1/2 w-full max-w-[768px] -translate-x-1/2 px-5",
              "max-[1330px]:left-0 max-[1330px]:translate-x-0",
            )}
          >
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white [filter:drop-shadow(0_5px_8px_#222A351d)]">
              <div
                className={cn(
                  "relative px-4 py-3.5 transition-[opacity,transform] duration-100",
                  selectedLinkIds.length > 0 &&
                    "pointer-events-none absolute inset-0 translate-y-1/2 opacity-0",
                )}
              >
                <PaginationControls
                  pagination={pagination}
                  setPagination={setPagination}
                  totalCount={linksCount}
                  unit={(plural) => `${plural ? "links" : "link"}`}
                >
                  {loading ? (
                    <LoadingSpinner className="size-3.5" />
                  ) : (
                    <div className="hidden sm:block">
                      <ArchivedLinksHint />
                    </div>
                  )}
                </PaginationControls>
              </div>

              <div
                className={cn(
                  "relative px-4 py-3.5 transition-[opacity,transform] duration-100",
                  !selectedLinkIds.length &&
                    "pointer-events-none absolute inset-0 translate-y-1/2 opacity-0",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLinkIds([])}
                      className="rounded-md p-1.5 transition-colors duration-75 hover:bg-neutral-50 active:bg-neutral-100"
                    >
                      <X className="size-4 text-neutral-900" />
                    </button>
                    <span className="whitespace-nowrap text-sm font-medium text-neutral-600">
                      <strong className="font-semibold">
                        {selectedLinkIds.length}
                      </strong>{" "}
                      selected
                    </span>
                  </div>

                  {/* Large screen controls */}
                  <div className="hidden items-center gap-2 min-[1120px]:flex">
                    {bulkActions.map(
                      ({
                        label,
                        icon: Icon,
                        action,
                        disabledTooltip,
                        keyboardShortcut,
                      }) => (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-7 gap-1.5 pl-2.5 pr-1.5 text-xs"
                          icon={<Icon className="size-3.5" />}
                          text={label}
                          onClick={action}
                          disabledTooltip={
                            disabledTooltip ||
                            (!hasAllFolderPermissions
                              ? "You don't have permission to perform this action."
                              : undefined)
                          }
                          shortcut={keyboardShortcut?.toUpperCase()}
                          shortcutClassName="py-0 px-1 text-[0.625rem] leading-snug"
                        />
                      ),
                    )}
                  </div>

                  {/* Small screen controls */}
                  <div className="block min-[1120px]:hidden">
                    <BulkActionMenu bulkActions={bulkActions} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

function BulkActionMenu({ bulkActions }: { bulkActions: BulkAction[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      content={
        <div>
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[130px]">
              {bulkActions.map(
                ({ label, icon: Icon, action, disabledTooltip }) => (
                  <Command.Item
                    disabled={!!disabledTooltip}
                    className={cn(
                      "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-800",
                      "data-[selected=true]:bg-neutral-100",
                      disabledTooltip && "cursor-not-allowed opacity-50",
                    )}
                    onSelect={() => {
                      setIsOpen(false);
                      action();
                    }}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </Command.Item>
                ),
              )}
            </Command.List>
          </Command>
        </div>
      }
      align="end"
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
    >
      <Button
        type="button"
        variant="secondary"
        className="h-7 px-1.5"
        icon={<ThreeDots className="size-4" />}
      />
    </Popover>
  );
}
