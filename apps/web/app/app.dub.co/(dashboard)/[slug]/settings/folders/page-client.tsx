"use client";

import { Folder } from "@/lib/link-folder/types";
import useFolders from "@/lib/swr/use-folders";
import useLinksCount from "@/lib/swr/use-links-count";
import { FolderCard } from "@/ui/folders/folder-card";
import { FolderCardPlaceholder } from "@/ui/folders/folder-card-placeholder";
import { useAddFolderModal } from "@/ui/modals/add-folder-modal";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { TooltipContent, useRouterStuff } from "@dub/ui";
import { InfoTooltip } from "@dub/ui/src/tooltip";
import { useEffect } from "react";

const allLinkFolder: Folder = {
  id: "all-links",
  name: "All links",
  accessLevel: null,
  linkCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const FoldersPageClient = () => {
  const { queryParams } = useRouterStuff();
  const { folders, isLoading, isValidating } = useFolders({
    includeParams: true,
  });
  const { AddFolderButton, AddFolderModal } = useAddFolderModal();

  const { data: allLinksCount } = useLinksCount({
    showArchived: true,
  });

  useEffect(() => {
    if (allLinksCount) {
      allLinkFolder.linkCount = allLinksCount;
    }
  }, [allLinksCount]);

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
            <div className="w-full md:w-56 lg:w-64">
              <SearchBoxPersisted
                loading={isValidating}
                inputClassName="h-10"
                onChangeDebounced={(t) => {
                  if (t) {
                    queryParams({ set: { search: t } });
                  } else {
                    queryParams({ del: "search" });
                  }
                }}
              />
            </div>
            <AddFolderButton />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <FolderCardPlaceholder key={idx} />
            ))
          ) : (
            <>
              <FolderCard folder={allLinkFolder} />
              {folders?.map((folder) => (
                <FolderCard key={folder.id} folder={folder} />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
};
