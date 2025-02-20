import { unsortedLinks } from "@/lib/folder/constants";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useFolders from "@/lib/swr/use-folders";
import useWorkspace from "@/lib/swr/use-workspace";
import { FolderSummary } from "@/lib/types";
import { Button, Combobox, TooltipContent } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAddFolderModal } from "../modals/add-folder-modal";
import { FolderIcon } from "./folder-icon";

interface FolderDropdownProps {
  variant?: "inline" | "input";
  onFolderSelect?: (folder: FolderSummary) => void;
  hideViewAll?: boolean;
  hideFolderIcon?: boolean;
  buttonClassName?: string;
  buttonTextClassName?: string;
  disableAutoRedirect?: boolean; // decide if we should auto redirect to the folder after it's created
  selectedFolderId?: string;
}

export const FolderDropdown = ({
  variant = "inline",
  onFolderSelect,
  hideViewAll = false,
  hideFolderIcon = false,
  buttonClassName,
  buttonTextClassName,
  disableAutoRedirect = false,
  selectedFolderId,
}: FolderDropdownProps) => {
  const router = useRouter();
  const { slug, plan } = useWorkspace();
  const searchParams = useSearchParams();
  const { folders, loading } = useFolders();
  const [openPopover, setOpenPopover] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState<FolderSummary | null>(
    unsortedLinks,
  );

  const folderId = selectedFolderId || searchParams.get("folderId");

  const { AddFolderModal, setShowAddFolderModal } = useAddFolderModal({
    onSuccess: (folder) => {
      setSelectedFolder(folder);
      onFolderSelect?.(folder);

      if (!disableAutoRedirect) {
        if (folder.id !== "unsorted") {
          router.push(`/${slug}?folderId=${folder.id}`);
        } else {
          router.push(`/${slug}`);
        }
      }
    },
  });

  useEffect(() => {
    if (folders) {
      const folder = folders.find((f) => f.id === folderId) || unsortedLinks;
      setSelectedFolder(folder);
      onFolderSelect?.(folder);
    }
  }, [folderId, folders]);

  const { canAddFolder } = getPlanCapabilities(plan);

  const folderOptions = useMemo(() => {
    const allFolders = [unsortedLinks, ...(folders || [])];
    return [
      ...allFolders.map((folder) => ({
        value: folder.id,
        label: folder.name,
        icon: <FolderIcon className="mr-1" folder={folder} shape="square" />,
        meta: folder,
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
  }, [folders, canAddFolder, slug]);

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

  if (folderId && loading) {
    return <FolderSwitcherPlaceholder />;
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
              : router.push(
                  `/${slug}${folder.id === "unsorted" ? "" : `?folderId=${folder.id}`}`,
                );
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
            />
          ) : undefined
        }
        optionRight={(option) =>
          option.value === "unsorted" ? (
            <div className="rounded bg-neutral-100 p-1">
              <div className="text-xs font-normal text-black">Unsorted</div>
            </div>
          ) : undefined
        }
        caret={
          <ChevronsUpDown className="ml-2 size-4 shrink-0 text-neutral-400" />
        }
        buttonProps={{
          className: cn(
            "group flex items-center gap-2 rounded-lg px-2 py-1 w-fit",
            variant === "inline" && "border-none !ring-0",
            "transition-colors hover:bg-neutral-100 active:bg-neutral-200 data-[state=open]:bg-neutral-100",
            buttonClassName,
          ),
          textWrapperClassName: cn(
            "min-w-0 truncate text-left text-xl font-semibold leading-7 text-neutral-900 md:text-2xl",
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
      >
        {selectedFolder ? selectedFolder.name : "Links"}
      </Combobox>
    </>
  );
};

const FolderItemPlaceholder = () => {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <div className="size-6 animate-pulse rounded-md bg-neutral-200" />
      <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-200" />
    </div>
  );
};

const FolderSwitcherPlaceholder = () => {
  return <div className="h-10 w-40 animate-pulse rounded-lg bg-neutral-200" />;
};
