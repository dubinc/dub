"use client";

import useFolders from "@/lib/swr/use-folders";
import useFoldersCount from "@/lib/swr/use-folders-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { Folder } from "@/lib/types";
import { FOLDERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/folders";
import { FolderCard } from "@/ui/folders/folder-card";
import { FolderCardPlaceholder } from "@/ui/folders/folder-card-placeholder";
import { useAddFolderModal } from "@/ui/modals/add-folder-modal";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { PaginationControls, usePagination, useRouterStuff } from "@dub/ui";
import { useRouter, useSearchParams } from "next/navigation";

const allLinkFolder: Folder = {
  id: "unsorted",
  name: "Links",
  type: "default",
  accessLevel: null,
  linkCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const FoldersPageClient = () => {
  const router = useRouter();
  const { flags } = useWorkspace();
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();

  const { AddFolderButton, AddFolderModal } = useAddFolderModal();

  const { data: foldersCount } = useFoldersCount({
    includeParams: true,
  });
  const { folders, loading, isValidating } = useFolders({
    includeParams: true,
  });

  const showAllLinkFolder =
    !searchParams.get("search") || folders?.length === 0;

  if (flags && !flags.linkFolders) {
    router.push("/settings");
  }

  const { pagination, setPagination } = usePagination(FOLDERS_MAX_PAGE_SIZE);

  return (
    <>
      <AddFolderModal />
      <div className="grid gap-5">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto">
          <div className="w-full md:w-56 lg:w-64">
            <SearchBoxPersisted
              loading={isValidating}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <FolderCardPlaceholder key={idx} />
            ))
          ) : (
            <>
              {showAllLinkFolder && <FolderCard folder={allLinkFolder} />}
              {folders?.map((folder) => (
                <FolderCard key={folder.id} folder={folder} />
              ))}
            </>
          )}
        </div>
      </div>
      <div className="sticky bottom-0 rounded-b-[inherit] border-t border-neutral-200 bg-white px-3.5 py-2">
        <PaginationControls
          pagination={pagination}
          setPagination={setPagination}
          totalCount={foldersCount || 0}
          unit={(p) => `folder${p ? "s" : ""}`}
        />
      </div>
    </>
  );
};
