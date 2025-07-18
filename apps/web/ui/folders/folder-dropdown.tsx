"use client";

import { unsortedLinks } from "@/lib/folder/constants";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useFolder from "@/lib/swr/use-folder";
import useFolders from "@/lib/swr/use-folders";
import useLinksCount from "@/lib/swr/use-links-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { FolderLinkCount, FolderSummary } from "@/lib/types";
import { FOLDERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/folders";
import { Button, Combobox, TooltipContent, useRouterStuff } from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useAddFolderModal } from "../modals/add-folder-modal";
import { FolderIcon } from "./folder-icon";

interface FolderDropdownProps {
  variant?: "inline" | "input";
  onFolderSelect?: (folder: FolderSummary) => void;
  hideViewAll?: boolean;
  hideFolderIcon?: boolean;
  buttonClassName?: string;
  buttonTextClassName?: string;
  iconClassName?: string;
  disableAutoRedirect?: boolean; // decide if we should auto redirect to the folder after it's created
  selectedFolderId?: string;
  loadingPlaceholder?: ReactNode;
}

export const FolderDropdown = ({
  variant = "inline",
  onFolderSelect,
  hideViewAll = false,
  hideFolderIcon = false,
  buttonClassName,
  buttonTextClassName,
  iconClassName,
  disableAutoRedirect = false,
  selectedFolderId,
  loadingPlaceholder,
}: FolderDropdownProps) => {
  const router = useRouter();
  const { slug, plan, defaultFolderId } = useWorkspace();
  const { searchParams, queryParams } = useRouterStuff();

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  // Whether to fetch search results from the backend
  const [useAsync, setUseAsync] = useState(false);

  const { folders, loading } = useFolders({
    query: useAsync ? { search: debouncedSearch } : undefined,
    options: {
      keepPreviousData: true,
    },
  });

  // If at any point the number of folders is greater than the max page size, we should fetch based on search
  useEffect(() => {
    if (folders && !useAsync && folders.length >= FOLDERS_MAX_PAGE_SIZE)
      setUseAsync(true);
  }, [folders, useAsync]);

  const { data: folderLinksCount } = useLinksCount<FolderLinkCount[]>({
    query: {
      groupBy: "folderId",
    },
    ignoreParams: true,
  });

  const [openPopover, setOpenPopover] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState<FolderSummary | null>(
    unsortedLinks,
  );

  const folderId =
    selectedFolderId || searchParams.get("folderId") || defaultFolderId;

  const { folder: selectedFolderData } = useFolder({
    folderId,
    enabled: !!folderId,
  });

  const { AddFolderModal, setShowAddFolderModal } = useAddFolderModal({
    onSuccess: (folder) => {
      setSelectedFolder(folder);
      onFolderSelect?.(folder);

      if (!disableAutoRedirect) {
        router.push(
          `/${slug}/links${folderId && folderId !== "unsorted" ? `?folderId=${folder.id}` : ""}`,
        );
      }
    },
  });

  // Update selected folder when folderId changes and selectedFolderData is available
  useEffect(() => {
    if (selectedFolderData && folderId === selectedFolderData.id) {
      setSelectedFolder(selectedFolderData);
      onFolderSelect?.(selectedFolderData);
    } else if (!folderId || folderId === "unsorted") {
      setSelectedFolder(unsortedLinks);
      onFolderSelect?.(unsortedLinks);
    }
  }, [folderId, selectedFolderData]);

  const { canAddFolder } = getPlanCapabilities(plan);

  const folderOptions = useMemo(() => {
    const allFolders = [
      unsortedLinks,
      ...(folders || []),
      ...(selectedFolderData &&
      !debouncedSearch &&
      !folders?.find(({ id }) => id === selectedFolderData.id)
        ? [selectedFolderData]
        : []),
    ];
    if (folderId && folderId !== "unsorted") {
      router.prefetch(`/${slug}/links?folderId=${folderId}`);
    }

    return [
      ...allFolders.map((folder) => ({
        value: folder.id,
        label: folder.name,
        icon: <FolderIcon className="mr-1" folder={folder} shape="square" />,
        meta: {
          ...folder,
          linksCount:
            folderLinksCount?.find(
              ({ folderId }) =>
                folderId === folder.id ||
                (folder.id === "unsorted" && folderId === null),
            )?._count || 0,
        },
        first: folder.id === "unsorted",
      })),
      {
        value: "create",
        label: "Create new folder",
        icon: (
          <FolderIcon
            className="mr-1"
            folder={{ id: "new", accessLevel: null }}
            shape="square"
          />
        ),
        disabledTooltip: !canAddFolder ? (
          <TooltipContent
            title="You can only use Link Folders on a Pro plan and above. Upgrade to Pro to continue."
            cta="Upgrade to Pro"
            href={`/${slug}/upgrade`}
          />
        ) : undefined,
      },
    ];
  }, [folders, selectedFolderData, canAddFolder, slug, debouncedSearch]);

  const selectedOption = useMemo(() => {
    if (!selectedFolder) return null;
    return {
      value: selectedFolder.id,
      label: selectedFolder.name,
      icon: (
        <FolderIcon className="mr-1" folder={selectedFolder} shape="square" />
      ),
      meta: selectedFolder,
    };
  }, [selectedFolder]);

  if (folderId && folderId !== "unsorted" && !selectedFolderData) {
    // if (true) {
    return loadingPlaceholder ?? <FolderDropdownPlaceholder />;
  }

  return (
    <>
      <AddFolderModal />
      <Combobox
        selected={selectedOption}
        setSelected={(option) => {
          if (option?.value === "create") {
            setShowAddFolderModal(true);
            return;
          }

          const folder = option?.meta;
          if (folder) {
            setSelectedFolder(folder);
            onFolderSelect
              ? onFolderSelect(folder)
              : queryParams({
                  ...(folder.id === "unsorted"
                    ? { del: "folderId" }
                    : { set: { folderId: folder.id } }),
                });
          }
        }}
        inputRight={
          hideViewAll ? undefined : (
            <Link
              href={`/${slug}/settings/library/folders`}
              onClick={() => setOpenPopover(false)}
              className="rounded-md border border-neutral-200 px-2 py-1 text-xs transition-colors hover:bg-neutral-100"
            >
              View All
            </Link>
          )
        }
        options={loading ? undefined : folderOptions}
        icon={
          !(selectedFolder?.id === "unsorted" && hideFolderIcon) &&
          selectedFolder ? (
            <FolderIcon
              folder={selectedFolder}
              shape="square"
              className="hidden md:block"
              iconClassName={iconClassName}
            />
          ) : undefined
        }
        optionRight={(option) =>
          option.meta && option.meta.linksCount ? (
            <span className="text-xs text-neutral-500">
              {option.meta.type === "mega"
                ? "10,000+"
                : nFormatter(option.meta.linksCount, { full: true })}
            </span>
          ) : undefined
        }
        caret={
          <ChevronsUpDown className="ml-2 size-4 shrink-0 text-neutral-400" />
        }
        buttonProps={{
          className: cn(
            "group flex items-center gap-2 rounded-lg px-2 py-1 w-fit",
            variant === "inline" && "border-none !ring-0 bg-transparent",
            "transition-all hover:bg-neutral-100 active:bg-neutral-200 data-[state=open]:bg-neutral-100",
            buttonClassName,
          ),
          textWrapperClassName: cn(
            "min-w-0 truncate text-left text-lg font-semibold leading-7 text-content-emphasis",
            buttonTextClassName,
          ),
        }}
        optionClassName="md:min-w-[250px]"
        searchPlaceholder="Search folders..."
        matchTriggerWidth={variant === "input"}
        emptyState={
          <div className="flex w-full flex-col items-center gap-2 py-4">
            No folders found
            <Button
              onClick={() => {
                setOpenPopover(false);
                setShowAddFolderModal(true);
              }}
              variant="primary"
              className="h-7 w-fit px-2"
              disabledTooltip={
                !canAddFolder ? (
                  <TooltipContent
                    title="You can only use Link Folders on a Pro plan and above. Upgrade to Pro to continue."
                    cta="Upgrade to Pro"
                    href={`/${slug}/upgrade`}
                  />
                ) : undefined
              }
              text="Create folder"
            />
          </div>
        }
        open={openPopover}
        onOpenChange={setOpenPopover}
        shouldFilter={!useAsync}
        onSearchChange={setSearch}
      >
        {selectedFolder ? selectedFolder.name : "Links"}
      </Combobox>
    </>
  );
};

const FolderDropdownPlaceholder = () => {
  return <div className="h-10 w-40 animate-pulse rounded-lg bg-neutral-200" />;
};
