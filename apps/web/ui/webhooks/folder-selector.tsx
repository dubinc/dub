"use client";

import useFolders from "@/lib/swr/use-folders";
import { Folder } from "@/lib/types";
import { Combobox } from "@dub/ui";
import { cn } from "@dub/utils";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { FolderIcon } from "../folders/folder-icon";

const MAX_DISPLAYED_FOLDERS = 10;

const getFolderOption = (folder: Folder) => ({
  value: folder.id,
  label: folder.name,
  icon: <FolderIcon className="mr-1 shrink-0" folder={folder} shape="square" />,
  meta: {
    folder,
  },
});

export function FoldersSelector({
  selectedFolderIds,
  setSelectedFolderIds,
  disabled,
}: {
  selectedFolderIds: string[];
  setSelectedFolderIds: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { folders } = useFolders({
    query: {
      search: debouncedSearch,
    },
    options: {
      keepPreviousData: false,
    },
  });

  // Default (unsearched) list to resolve the names of already-selected folders
  const { folders: selectedFolders } = useFolders();

  const options = useMemo(
    () => folders?.map((folder) => getFolderOption(folder)),
    [folders],
  );

  const selectedOptions = useMemo(
    () =>
      selectedFolderIds
        .map((id) =>
          [...(folders || []), ...(selectedFolders || [])].find(
            (f) => f.id === id,
          ),
        )
        .filter(Boolean)
        .map((f) => getFolderOption(f as Folder)),
    [selectedFolderIds, folders, selectedFolders],
  );

  // Calculate how many additional folders are not displayed:
  const plusCount =
    selectedFolderIds.length > selectedOptions.length
      ? selectedFolderIds.length -
        Math.min(selectedOptions.length, MAX_DISPLAYED_FOLDERS)
      : Math.max(0, selectedOptions.length - MAX_DISPLAYED_FOLDERS);

  return (
    <Combobox
      multiple
      caret
      matchTriggerWidth
      side="top" // Since this control is near the bottom of the page, prefer top to avoid jumping
      options={options}
      selected={selectedOptions ?? []}
      onSelect={({ value: id }) =>
        setSelectedFolderIds(
          selectedFolderIds.includes(id)
            ? selectedFolderIds.filter((sid) => sid !== id)
            : [...selectedFolderIds, id],
        )
      }
      shouldFilter={false}
      onSearchChange={setSearch}
      buttonProps={{
        disabled,
        className: cn(
          "h-auto py-1.5 px-2.5 w-full max-w-full text-neutral-700 border-neutral-300 items-start",
        ),
      }}
    >
      {selectedFolderIds.length === 0 ? (
        <div className="py-0.5">Select folders...</div>
      ) : selectedFolders && selectedOptions ? (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.slice(0, MAX_DISPLAYED_FOLDERS).map((option) => (
            <span
              key={option.value}
              className="animate-fade-in flex min-w-0 items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-1 text-xs text-neutral-600"
            >
              <FolderIcon
                folder={option.meta.folder}
                shape="square"
                className="size-3 shrink-0"
                innerClassName="flex size-full items-center justify-center p-0"
                iconClassName="size-2.5"
              />
              <span className="min-w-0 truncate">{option.label}</span>
            </span>
          ))}
          {plusCount > 0 && (
            <span className="animate-fade-in flex rounded-md bg-neutral-100 px-1.5 py-1 text-xs font-medium text-neutral-600">
              + {plusCount} more
            </span>
          )}
        </div>
      ) : (
        <div className="my-0.5 h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
      )}
    </Combobox>
  );
}
