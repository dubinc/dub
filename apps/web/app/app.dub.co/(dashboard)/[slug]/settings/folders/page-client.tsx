"use client";

import useFolders from "@/lib/swr/use-folders";
import useLinksCount from "@/lib/swr/use-links-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { FolderCard } from "@/ui/folders/folder-card";
import { FolderCardPlaceholder } from "@/ui/folders/folder-card-placeholder";
import EmptyState from "@/ui/shared/empty-state";
import { CardList, TooltipContent } from "@dub/ui";
import { InfoTooltip } from "@dub/ui/src/tooltip";
import { Folder } from "lucide-react";

export const FoldersPageClient = () => {
  const { id: workspaceId } = useWorkspace();
  const { folders, isLoading, isValidating } = useFolders();

  const { data: linksCount } = useLinksCount({
    groupBy: "folderId",
    showArchived: true,
  });

  // const { AddEditTagModal, AddTagButton } = useAddEditTagModal();
  // const [openMenuTagId, setOpenMenuTagId] = useState<string | null>(null);
  // const { tags, loading } = useTags();
  // const { data: tagsCount } = useLinksCount({
  //   groupBy: "tagId",
  //   showArchived: true,
  // });

  return (
    <>
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
            {/* <AddTagButton /> */}
          </div>
        </div>

        {/* {workspaceId && <AddEditTagModal />} */}

        {isLoading || folders?.length ? (
          <CardList variant="loose" loading={isLoading}>
            {folders?.length
              ? folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    linksCount={
                      linksCount?.find((c) => c.folderId === folder.id)
                        ?.count ?? 0
                    }
                  />
                ))
              : Array.from({ length: 6 }).map((_, idx) => (
                  <FolderCardPlaceholder key={idx} />
                ))}
          </CardList>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 py-10">
            <EmptyState
              icon={Folder}
              title="No folders found for this workspace."
            />
            {/* <AddTagButton /> */}
          </div>
        )}
      </div>
    </>
  );
};
