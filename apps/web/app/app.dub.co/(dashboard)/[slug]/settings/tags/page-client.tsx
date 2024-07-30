"use client";

import useLinksCount from "@/lib/swr/use-links-count";
import useTags from "@/lib/swr/use-tags";
import useWorkspace from "@/lib/swr/use-workspace";
import { useAddEditTagModal } from "@/ui/modals/add-edit-tag-modal";
import EmptyState from "@/ui/shared/empty-state";
import { CardList } from "@dub/ui";
import { Tag } from "@dub/ui/src/icons";
import { InfoTooltip, TooltipContent } from "@dub/ui/src/tooltip";
import { Dispatch, SetStateAction, createContext, useState } from "react";
import { TagCard } from "./tag-card";
import { TagCardPlaceholder } from "./tag-card-placeholder";

export const TagsListContext = createContext<{
  openMenuTagId: string | null;
  setOpenMenuTagId: Dispatch<SetStateAction<string | null>>;
}>({
  openMenuTagId: null,
  setOpenMenuTagId: () => {},
});

export default function WorkspaceTagsClient() {
  const { id: workspaceId } = useWorkspace();

  const { AddEditTagModal, AddTagButton } = useAddEditTagModal();

  const { tags, loading } = useTags();
  const { data: tagsCount } = useLinksCount({
    groupBy: "tagId",
    showArchived: true,
  });

  const [openMenuTagId, setOpenMenuTagId] = useState<string | null>(null);

  return (
    <>
      <div className="grid gap-5">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="flex items-center gap-x-2">
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Tags
            </h1>
            <InfoTooltip
              content={
                <TooltipContent
                  title="Learn more about how to use tags on Dub."
                  href="https://dub.co/help/article/how-to-use-tags"
                  target="_blank"
                  cta="Learn more"
                />
              }
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <AddTagButton />
          </div>
        </div>
        {workspaceId && <AddEditTagModal />}

        {loading || tags?.length ? (
          <TagsListContext.Provider value={{ openMenuTagId, setOpenMenuTagId }}>
            <CardList variant="compact" loading={loading}>
              {tags?.length
                ? tags.map((tag) => (
                    <TagCard key={tag.id} tag={tag} tagsCount={tagsCount} />
                  ))
                : Array.from({ length: 6 }).map((_, idx) => (
                    <TagCardPlaceholder key={idx} />
                  ))}
            </CardList>
          </TagsListContext.Provider>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 py-10">
            <EmptyState icon={Tag} title="No tags found for this workspace" />
            <AddTagButton />
          </div>
        )}
      </div>
    </>
  );
}
