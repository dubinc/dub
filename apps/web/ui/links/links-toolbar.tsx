import useWorkspace from "@/lib/swr/use-workspace";
import {
  BoxArchive,
  Button,
  Folder,
  Icon,
  LoadingSpinner,
  PaginationControls,
  Popover,
  Trash,
  usePagination,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { useState } from "react";
import { useArchiveLinkModal } from "../modals/archive-link-modal";
import { useDeleteLinkModal } from "../modals/delete-link-modal";
import { useMoveLinkToFolderModal } from "../modals/move-link-to-folder-modal";
import { ThreeDots, X } from "../shared/icons";
import ArchivedLinksHint from "./archived-links-hint";
import { useLinkSelection } from "./link-selection-provider";
import { ResponseLink } from "./links-container";

type BulkAction = {
  label: string;
  icon: Icon;
  action: () => void;
  disabledTooltip?: string;
};

export const LinksToolbar = ({
  loading,
  links,
  linksCount,
}: {
  loading: boolean;
  links: ResponseLink[];
  linksCount: number;
}) => {
  const { flags } = useWorkspace();

  const { selectedLinkIds, setSelectedLinkIds } = useLinkSelection();
  const { pagination, setPagination } = usePagination();

  const selectedLinks = links.filter(({ id }) => selectedLinkIds.includes(id));

  const { setShowArchiveLinkModal, ArchiveLinkModal } = useArchiveLinkModal({
    props: selectedLinks,
  });

  const { setShowDeleteLinkModal, DeleteLinkModal } = useDeleteLinkModal({
    props: selectedLinks,
  });

  const { setShowMoveLinkToFolderModal, MoveLinkToFolderModal } =
    useMoveLinkToFolderModal({
      links: selectedLinks,
    });

  const bulkActions: BulkAction[] = [
    ...(flags?.linkFolders
      ? [
          {
            label: "Folder",
            icon: Folder,
            action: () => setShowMoveLinkToFolderModal(true),
          },
        ]
      : []),
    {
      label:
        selectedLinks.length && selectedLinks.every(({ archived }) => archived)
          ? "Unarchive"
          : "Archive",
      icon: BoxArchive,
      action: () => setShowArchiveLinkModal(true),
    },
    {
      label: "Delete",
      icon: Trash,
      action: () => setShowDeleteLinkModal(true),
      disabledTooltip: selectedLinks.some(({ programId }) => programId)
        ? "You can't delete a link that's part of a program."
        : undefined,
    },
  ];

  return (
    <>
      <ArchiveLinkModal />
      <DeleteLinkModal />
      <MoveLinkToFolderModal />

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
                  <span className="text-sm font-medium text-neutral-600">
                    <strong className="font-semibold">
                      {selectedLinkIds.length}
                    </strong>{" "}
                    selected
                  </span>
                </div>

                {/* Large screen controls */}
                <div className="hidden items-center gap-2 lg:flex">
                  {bulkActions.map(
                    ({ label, icon: Icon, action, disabledTooltip }) => (
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-7 px-2.5"
                        icon={<Icon className="size-4" />}
                        text={label}
                        onClick={action}
                        disabledTooltip={disabledTooltip}
                      />
                    ),
                  )}
                </div>

                {/* Small screen controls */}
                <div className="block lg:hidden">
                  <BulkActionMenu bulkActions={bulkActions} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

function BulkActionMenu({ bulkActions }: { bulkActions: BulkAction[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      content={
        <div>
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[130px]">
              {bulkActions.map(({ label, icon: Icon, action }) => (
                <Command.Item
                  className={cn(
                    "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-800",
                    "data-[selected=true]:bg-neutral-100",
                  )}
                  onSelect={() => {
                    setIsOpen(false);
                    action();
                  }}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Command.Item>
              ))}
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
