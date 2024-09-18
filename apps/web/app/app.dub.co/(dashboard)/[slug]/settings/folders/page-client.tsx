"use client";

import useFolders from "@/lib/swr/use-folders";
import useLinksCount from "@/lib/swr/use-links-count";
import { FolderCard } from "@/ui/folders/folder-card";
import { FolderCardPlaceholder } from "@/ui/folders/folder-card-placeholder";
import { useAddFolderModal } from "@/ui/modals/add-folder-modal";
import EmptyState from "@/ui/shared/empty-state";
import { TooltipContent } from "@dub/ui";
import { InfoTooltip } from "@dub/ui/src/tooltip";
import { Folder } from "lucide-react";

export const FoldersPageClient = () => {
  const { folders, isLoading } = useFolders();
  const { AddFolderButton, AddFolderModal } = useAddFolderModal();

  const { data: linksCount } = useLinksCount({
    groupBy: "folderId",
    showArchived: true,
  });

  return (
    <>
      <AddFolderModal />
      <div className="grid gap-5">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="flex items-center gap-x-2">
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Folders
            </h1>
            <InfoTooltip
              content={
                <TooltipContent
                  title="Learn more about how to use folders on Dub."
                  href="https://dub.co/help/article/how-to-use-folders"
                  target="_blank"
                  cta="Learn more"
                />
              }
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <AddFolderButton />
          </div>
        </div>

        {!isLoading && !folders?.length && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 py-10">
            <EmptyState
              icon={Folder}
              title="No folders found for this workspace"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, idx) => (
                <FolderCardPlaceholder key={idx} />
              ))
            : folders?.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  linksCount={linksCount}
                />
              ))}
        </div>
      </div>
    </>
  );
};
